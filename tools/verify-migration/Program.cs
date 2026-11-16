using Microsoft.AspNetCore.Http;
using SecureClientPortal.Backend.Application;
using SecureClientPortal.Backend.Application.Common.Events;
using SecureClientPortal.Backend.Domain.Modules.Documents;
using SecureClientPortal.Backend.Infrastructure.Modules.Documents.Application;
using SecureClientPortal.Backend.Infrastructure.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SecureClientPortal.Backend.Application.Contracts.Modules.Migration;
using SecureClientPortal.Backend.Application.Modules.Documents;
using SecureClientPortal.Backend.Data;
using SecureClientPortal.Backend.Infrastructure.Modules.Migration;
using SecureClientPortal.Backend.Models;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

using var settings=JsonDocument.Parse(await File.ReadAllTextAsync(args[0]));
var configured=settings.RootElement.GetProperty("ConnectionStrings").GetProperty("DefaultConnection").GetString();
var database="portal_migration_verify_"+Guid.NewGuid().ToString("N");
var masterConfig=new SqlConnectionStringBuilder(configured){InitialCatalog="master",Pooling=false};
var testConfig=new SqlConnectionStringBuilder(configured){InitialCatalog=database,Pooling=false};
await using var master=new SqlConnection(masterConfig.ConnectionString);await master.OpenAsync();
await using var command=master.CreateCommand();command.CommandText=$"CREATE DATABASE [{database}]";await command.ExecuteNonQueryAsync();
var actorId=Guid.NewGuid();var actor=new ClaimsPrincipal(new ClaimsIdentity([new(ClaimTypes.NameIdentifier,actorId.ToString()),new(ClaimTypes.Role,"admin"),new("role_scope","admin")],"test"));
var storage=new Storage();
PortalDbContext Db(bool fail=false){var b=new DbContextOptionsBuilder<PortalDbContext>().UseSqlServer(testConfig.ConnectionString,SqlServerMigrationConfiguration.Portal);if(fail)b.AddInterceptors(new FailAudit());return new(b.Options);}
IFormFile Upload(string name,string value)=>new FormFile(new MemoryStream(Encoding.UTF8.GetBytes(value)),0,Encoding.UTF8.GetByteCount(value),"file",name){Headers=new HeaderDictionary(),ContentType="application/pdf"};
void Check(bool value,string label){if(!value)throw new InvalidOperationException(label);Console.WriteLine("PASS "+label);}
try {
    await using(var db=Db()) {
        await db.Database.MigrateAsync();Check(!db.Database.HasPendingModelChanges(),"all portal migrations apply with no model drift");
        db.RoleDefinitions.Add(RoleDefinition.Create("accountant","Accountant","accountant","[]",true));
        var admin=User.CreateInvited(actorId,"SQL migration admin","admin@example.invalid",UserRole.Admin,"unused","[]",null);admin.CompleteSetup("SQL migration admin","unused");db.Users.Add(admin);
        var accountant=User.CreateInvited(Guid.NewGuid(),"SQL migration accountant","accountant@example.invalid",UserRole.Accountant,"unused","[]",null);accountant.CompleteSetup("SQL migration accountant","unused");db.Users.Add(accountant);await db.SaveChangesAsync();
    }
    MigrationBatchDetail clientBatch;
    await using(var db=Db()) {
        var service=new DataMigrationService(db,storage);clientBatch=await service.CreateAsync(new(Guid.NewGuid(),"SQL transaction test"),actor,default);
        clientBatch=await service.SpreadsheetAsync(clientBatch.Summary.Id,0,Upload("clients.csv",ClientSpreadsheetReader.Header+"\nSQL migration business,Company,Services,Contact,contact@example.invalid,SQL-REG,accountant@example.invalid"),actor,default);
        Check(clientBatch.Clients[0].Errors.Length==0&&!await db.Clients.AnyAsync(),"client preview validates without creating records");
    }
    await using(var db=Db(true)) {
        try {await new DataMigrationService(db,storage).ApproveAsync(clientBatch.Summary.Id,new(clientBatch.Summary.Version,true),actor,default);throw new Exception("Expected audit failure");}
        catch(InvalidOperationException e)when(e.Message=="Forced approval audit failure"){}
    }
    await using(var db=Db()) {
        Check(!await db.Clients.AnyAsync()&&!await db.ClientAssignments.AnyAsync()&&(await db.Set<DataMigrationBatch>().FindAsync(clientBatch.Summary.Id))!.Status=="draft","failed approval rolls back client, assignment and batch atomically");
        var service=new DataMigrationService(db,storage);clientBatch=await service.ApproveAsync(clientBatch.Summary.Id,new(clientBatch.Summary.Version,true),actor,default);
        await service.ApproveAsync(clientBatch.Summary.Id,new(0,true),actor,default);
        Check(await db.Clients.CountAsync()==1&&await db.ClientAssignments.CountAsync()==1&&await db.Users.CountAsync()==2&&!await db.UserAccessTokens.AnyAsync(),"approval retries create one profile and assignment without logins or invites");
    }
    MigrationBatchDetail docs;Guid clientId;
    await using(var db=Db()) {
        clientId=await db.Clients.Select(c=>c.Id).SingleAsync();var service=new DataMigrationService(db,storage);docs=await service.CreateAsync(new(Guid.NewGuid(),"SQL historical documents"),actor,default);
        docs=await service.UploadAsync(docs.Summary.Id,Guid.NewGuid(),0,Upload("historical.pdf","historical content"),actor,default);
        Check(!await db.Documents.AnyAsync()&&!await db.MonthlyPacks.AnyAsync(),"uncertain documents stay out of client documents and monthly packs");
        docs=await service.EditDocumentAsync(docs.Summary.Id,docs.Documents[0].Id,new(docs.Summary.Version,new(clientId,2025,1,"invoices","historical.pdf",true,false,false)),actor,default);
    }
    await using(var db=Db(true)) {
        try {await new DataMigrationService(db,storage).ApproveAsync(docs.Summary.Id,new(docs.Summary.Version,true),actor,default);throw new Exception("Expected audit failure");}
        catch(InvalidOperationException e)when(e.Message=="Forced approval audit failure"){}
    }
    await using(var db=Db()) {
        Check(!await db.Documents.AnyAsync()&&!await db.MonthlyPacks.AnyAsync()&&!await db.DocumentVersions.AnyAsync(),"failed document approval rolls back document, version and historical pack");
        var service=new DataMigrationService(db,storage);docs=await service.ApproveAsync(docs.Summary.Id,new(docs.Summary.Version,true),actor,default);
        await service.ApproveAsync(docs.Summary.Id,new(0,true),actor,default);
        var document=await db.Documents.SingleAsync();
        Check(document.Status=="uploaded"&&!document.IsFiled&&document.DocumentSlotId is null&&!await db.ReviewDecisions.AnyAsync()&&!await db.Notifications.AnyAsync(),"historical import remains uploaded with no review, filing or notifications");
        Check(await db.DocumentVersions.CountAsync()==1&&await db.MonthlyPacks.CountAsync()==1,"document approval retry preserves one document version and pack");
        var dupe=await service.CreateAsync(new(Guid.NewGuid(),"SQL duplicate check"),actor,default);
        dupe=await service.UploadAsync(dupe.Summary.Id,Guid.NewGuid(),0,Upload("renamed.pdf","historical content"),actor,default);
        dupe=await service.EditDocumentAsync(dupe.Summary.Id,dupe.Documents[0].Id,new(dupe.Summary.Version,new(clientId,2025,2,"invoices","renamed.pdf",true,false,false)),actor,default);
        Check(dupe.Documents[0].Warnings.Length>0,"renamed identical content warns across approved import batches");
    }
    Guid invoiceId;
    await using(var db=Db()) invoiceId=await db.Documents.Select(d=>d.Id).SingleAsync();
    var invoiceValues=new SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewValues("SQL supplier","INV-SQL","2025-01-15","ZAR","1150.00","","1000.00","150.00","0",true);
    var invoiceRequest=new SecureClientPortal.Backend.Application.Contracts.Modules.Documents.SaveInvoiceReviewRequest(Guid.NewGuid(),1,0,invoiceValues,[new("invoiceTotal","Invoice total 1150.00",.1,.2,.3,.04,null,0)],true,null,"manual", LineItems: [new("Service","2","500.00","0","1000.00")], LineItemsConfirmed: true);
    await using(var db=Db(true)) {
        try {await new InvoiceReviewService(db).SaveAsync(invoiceId,invoiceRequest,actor,default);throw new Exception("Expected review audit failure");}
        catch(InvalidOperationException e)when(e.Message=="Forced approval audit failure"){}
    }
    await using(var db=Db()) {
        Check(!await db.Set<InvoiceReviewSnapshot>().AnyAsync()&&(await db.Documents.SingleAsync()).InvoiceReviewRevision==0,"invoice audit failure rolls back snapshot and review revision");
        var saved=await new InvoiceReviewService(db).SaveAsync(invoiceId,invoiceRequest,actor,default);
        Check(saved.CanAccept&&saved.Revision==1,"real SQL invoice rules permit a confirmed reconciled invoice");
        Check(saved.LineItemsConfirmed&&saved.LineItems?.Length==1&&saved.Findings.Any(x=>x.Rule=="lines.subtotal"&&x.Result=="no_issue_detected")&&saved.Evidence.Single().PageIndex==0,"V2 line items, source pages and findings persist on real SQL");
    }
    var accept=new SecureClientPortal.Backend.Application.Contracts.Modules.Documents.AddReviewDecisionRequest("accepted",null,null,new(1,1));
    await using(var db=Db(true)) {
        try {await new DocumentLifecycleService(db,db,new CurrentUserContextFactory(),new QuietEvents()).ReviewAsync(invoiceId.ToString(),accept,actor);throw new Exception("Expected acceptance audit failure");}
        catch(InvalidOperationException e)when(e.Message=="Forced approval audit failure"){}
    }
    await using(var db=Db()) {
        Check((await db.Documents.SingleAsync()).Status=="uploaded"&&!await db.ReviewDecisions.AnyAsync(),"invoice acceptance audit failure rolls back document and review decision");
        var lifecycle=new DocumentLifecycleService(db,db,new CurrentUserContextFactory(),new QuietEvents());
        await lifecycle.ReviewAsync(invoiceId.ToString(),accept,actor);
        var decision=await db.ReviewDecisions.SingleAsync();
        Check(decision.DocumentVersionNumber==1&&decision.InvoiceReviewRevision==1,"accepted decision binds the exact file and review revision");
        await lifecycle.UpdateStatusAsync(invoiceId.ToString(),new("filed"),actor);
        Check((await db.Documents.SingleAsync()).IsFiled,"accepted invoice can enter filing with versioned review evidence");
    }
    Guid concurrentInvoice;
    await using(var db=Db()) {
        var first=await db.Documents.FirstAsync();
        var next=Document.CreateUploaded(Guid.NewGuid(),first.ClientId,first.MonthlyPackId,"concurrent.pdf","invoices",null,"application/pdf",20,"private-concurrent",actorId);
        db.Documents.Add(next);await db.SaveChangesAsync();concurrentInvoice=next.Id;
    }
    async Task<bool> SaveConcurrentReview() {
        await using var db=Db();
        try {
            await new InvoiceReviewService(db).SaveAsync(concurrentInvoice,invoiceRequest with {RequestId=Guid.NewGuid()},actor,default);
            return true;
        } catch(DbUpdateConcurrencyException) {return false;}
        catch(DbUpdateException e)when(e.InnerException is SqlException sql&&sql.Number is 2601 or 2627 or 1205) {return false;}
        catch(SqlException e)when(e.Number==1205) {return false;}
    }
    var concurrentResults=await Task.WhenAll(SaveConcurrentReview(),SaveConcurrentReview());
    await using(var db=Db()) {
        Check(concurrentResults.Count(x=>x)==1&&await db.Set<InvoiceReviewSnapshot>().CountAsync(x=>x.DocumentId==concurrentInvoice)==1&&(await db.Documents.FindAsync(concurrentInvoice))!.InvoiceReviewRevision==1,"concurrent reviewers preserve one snapshot and reject the stale write");
    }
} finally {
    SqlConnection.ClearAllPools();
    if(!System.Text.RegularExpressions.Regex.IsMatch(database,"^portal_migration_verify_[a-f0-9]{32}$"))throw new InvalidOperationException("Unsafe test database name");
    command.CommandText=$"ALTER DATABASE [{database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{database}]";await command.ExecuteNonQueryAsync();
}
sealed class FailAudit:SaveChangesInterceptor {
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData data,InterceptionResult<int> result,CancellationToken ct=default) {
        if(data.Context!.ChangeTracker.Entries<AuditLog>().Any(e=>e.State==EntityState.Added&&e.Entity.Action is "migration.approved" or "documents.invoice_review_saved" or "documents.accepted"))throw new InvalidOperationException("Forced approval audit failure");return ValueTask.FromResult(result);
    }
}
sealed class Storage:IFileStorage {
    private readonly Dictionary<string,byte[]> files=[];
    public async Task<StoredFile> SaveAsync(IFormFile file,string clientId,CancellationToken ct=default){using var s=new MemoryStream();await file.CopyToAsync(s,ct);var key=Guid.NewGuid().ToString();files[key]=s.ToArray();return new(key,file.FileName,"stored.pdf","application/pdf",file.Length);}
    public Task<StoredFileContent?> OpenReadAsync(string key,CancellationToken ct=default)=>Task.FromResult(files.TryGetValue(key,out var bytes)?new StoredFileContent(new MemoryStream(bytes),"application/pdf"):null);
}

sealed class QuietEvents:IDomainEventDispatcher {
    public Task DispatchAsync(IEnumerable<IDomainEvent> events,CancellationToken ct=default)=>Task.CompletedTask;
}
