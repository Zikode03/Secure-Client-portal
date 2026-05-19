using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecureClientPortal.Backend.Data;
using SecureClientPortal.Backend.Models;
using System.IdentityModel.Tokens.Jwt;

namespace SecureClientPortal.Backend.Controllers;

public record UpdateDocumentStatusRequest(string Status);
public record FilingRuleUpdateRequest(bool IsEnabled);

[ApiController]
[Route("api/documents")]
[Authorize(Policy = "ClientOrAccountant")]
public class DocumentsController : ControllerBase
{
    private readonly PortalDbContext _db;

    public DocumentsController(PortalDbContext db)
    {
        _db = db;
    }

    // Returns the working document set (all statuses) for operations/review.
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Document>>> GetAll()
    {
        return Ok(await _db.Documents.OrderByDescending(x => x.UploadedAtUtc).ToListAsync());
    }

    // Returns the read-only filing register (only documents that are actually filed).
    [HttpGet("filing-register")]
    public async Task<ActionResult<IEnumerable<Document>>> GetFilingRegister([FromQuery] string? clientId = null)
    {
        var query = _db.Documents.Where(x => x.IsFiled);
        if (!string.IsNullOrWhiteSpace(clientId))
        {
            query = query.Where(x => x.ClientId == clientId);
        }

        return Ok(await query.OrderByDescending(x => x.FiledAtUtc).ThenByDescending(x => x.UploadedAtUtc).ToListAsync());
    }

    // Returns the active filing allowlist and switches used by automatic filing.
    [HttpGet("filing-rules")]
    [Authorize(Policy = "AccountantOnly")]
    public async Task<ActionResult<IEnumerable<FilingRule>>> GetFilingRules()
    {
        return Ok(await _db.FilingRules.OrderBy(x => x.Category).ToListAsync());
    }

    // Updates one filing rule toggle. This controls future auto-filing eligibility.
    [HttpPut("filing-rules/{category}")]
    [Authorize(Policy = "AccountantOnly")]
    public async Task<ActionResult<FilingRule>> UpdateFilingRule(string category, [FromBody] FilingRuleUpdateRequest request)
    {
        var normalizedCategory = NormalizeCategory(category);
        var item = await _db.FilingRules.FirstOrDefaultAsync(x => x.Category == normalizedCategory);
        if (item is null) return NotFound();

        item.IsEnabled = request.IsEnabled;
        item.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<Document>> Create([FromBody] Document request)
    {
        if (string.IsNullOrWhiteSpace(request.Id)) request.Id = $"doc_{Guid.NewGuid():N}";
        request.UploadedAtUtc = DateTime.UtcNow;
        request.UpdatedAtUtc = request.UploadedAtUtc;

        _db.Documents.Add(request);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = request.Id }, request);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Document>> GetById(string id)
    {
        var item = await _db.Documents.FindAsync(id);
        if (item is null) return NotFound();
        return Ok(item);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "AccountantOnly")]
    public async Task<ActionResult<Document>> Update(string id, [FromBody] Document request)
    {
        var item = await _db.Documents.FindAsync(id);
        if (item is null) return NotFound();

        item.Name = request.Name;
        item.Category = request.Category;
        var normalizedStatus = request.Status.Trim().ToLowerInvariant();
        if (normalizedStatus is not ("pending" or "under_review" or "accepted" or "rejected" or "filed"))
        {
            return BadRequest(new { error = "Invalid status value." });
        }
        item.SizeBytes = request.SizeBytes;
        item.StorageKey = request.StorageKey;
        await ApplyStatusAndFilingAsync(item, normalizedStatus);
        return Ok(item);
    }

    // Dedicated status endpoint so workflow status changes can trigger auto-filing logic.
    [HttpPut("{id}/status")]
    [Authorize(Policy = "AccountantOnly")]
    public async Task<ActionResult<Document>> UpdateStatus(string id, [FromBody] UpdateDocumentStatusRequest request)
    {
        var item = await _db.Documents.FindAsync(id);
        if (item is null) return NotFound();

        var normalizedStatus = request.Status.Trim().ToLowerInvariant();
        if (normalizedStatus is not ("pending" or "under_review" or "accepted" or "rejected" or "filed"))
        {
            return BadRequest(new { error = "Invalid status value." });
        }

        await ApplyStatusAndFilingAsync(item, normalizedStatus);
        return Ok(item);
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "AccountantOnly")]
    public async Task<IActionResult> Delete(string id)
    {
        var item = await _db.Documents.FindAsync(id);
        if (item is null) return NotFound();
        _db.Documents.Remove(item);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Normalization keeps frontend/backoffice category variants mapped to one filing key.
    private static string NormalizeCategory(string value)
    {
        var raw = value.Trim().ToLowerInvariant().Replace("-", "_").Replace(" ", "_");
        return raw switch
        {
            "bankstatement" => "bank_statement",
            "bank_statement" => "bank_statement",
            "invoice" => "invoices",
            "invoices" => "invoices",
            "signeddocuments" => "signed_documents",
            "signed_documents" => "signed_documents",
            "compliancerecord" => "compliance_record",
            "compliance_record" => "compliance_record",
            "payrollsummary" => "payroll_summary",
            "payroll_summary" => "payroll_summary",
            "taxworkingpapers" => "tax_working_papers",
            "tax_working_papers" => "tax_working_papers",
            "proofofpayment" => "proof_of_payment",
            "proof_of_payment" => "proof_of_payment",
            "creditnotes" => "credit_notes",
            "credit_notes" => "credit_notes",
            "debitnotes" => "debit_notes",
            "debit_notes" => "debit_notes",
            _ => raw
        };
    }

    // Keeps status updates consistent across endpoints and enforces auto-filing policy.
    private async Task ApplyStatusAndFilingAsync(Document item, string rawStatus)
    {
        var normalizedStatus = rawStatus.Trim().ToLowerInvariant();
        item.Status = normalizedStatus;
        item.UpdatedAtUtc = DateTime.UtcNow;

        if (normalizedStatus == "accepted")
        {
            var normalizedCategory = NormalizeCategory(item.Category);
            var canAutoFile = await _db.FilingRules.AnyAsync(x => x.Category == normalizedCategory && x.IsEnabled);
            if (canAutoFile)
            {
                item.Status = "filed";
                item.IsFiled = true;
                item.FiledAtUtc = DateTime.UtcNow;
                item.FiledByUserId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            }
            else
            {
                item.IsFiled = false;
                item.FiledAtUtc = null;
                item.FiledByUserId = null;
            }
        }
        else if (normalizedStatus != "filed")
        {
            item.IsFiled = false;
            item.FiledAtUtc = null;
            item.FiledByUserId = null;
        }

        await _db.SaveChangesAsync();
    }
}
