// Generated from openapi/portal-api.json. Run npm run api:generate; do not edit.
export interface paths {
    "/api/admin/firm-management/rules/deadlines": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["FirmManagement_GetDeadlineRules_GET_api_admin_firm_management_rules_deadlines"];
        put: operations["FirmManagement_PutDeadlineRules_PUT_api_admin_firm_management_rules_deadlines"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/firm-management/rules/escalations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["FirmManagement_GetEscalationRules_GET_api_admin_firm_management_rules_escalations"];
        put: operations["FirmManagement_PutEscalationRules_PUT_api_admin_firm_management_rules_escalations"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/firm-management/rules/reminders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["FirmManagement_GetReminderRules_GET_api_admin_firm_management_rules_reminders"];
        put: operations["FirmManagement_PutReminderRules_PUT_api_admin_firm_management_rules_reminders"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/firm-management/seed-defaults": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["FirmManagement_SeedDefaults_POST_api_admin_firm_management_seed_defaults"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/firm-management/templates/monthly-pack": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["FirmManagement_GetMonthlyPackTemplates_GET_api_admin_firm_management_templates_monthly_pack"];
        put: operations["FirmManagement_PutMonthlyPackTemplates_PUT_api_admin_firm_management_templates_monthly_pack"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/firm-management/templates/requests": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["FirmManagement_GetRequestTemplates_GET_api_admin_firm_management_templates_requests"];
        put: operations["FirmManagement_PutRequestTemplates_PUT_api_admin_firm_management_templates_requests"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/firm-management/templates/required-documents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["FirmManagement_GetRequiredDocumentTemplates_GET_api_admin_firm_management_templates_required_documents"];
        put: operations["FirmManagement_PutRequiredDocumentTemplates_PUT_api_admin_firm_management_templates_required_documents"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/migrations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["DataMigration_List_GET_api_admin_migrations"];
        put?: never;
        post: operations["DataMigration_Create_POST_api_admin_migrations"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/migrations/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["DataMigration_Get_GET_api_admin_migrations_id"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/migrations/{id}/approve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["DataMigration_Approve_POST_api_admin_migrations_id_approve"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/migrations/{id}/clients": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["DataMigration_Spreadsheet_POST_api_admin_migrations_id_clients"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/migrations/{id}/clients/{rowId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["DataMigration_EditClient_PUT_api_admin_migrations_id_clients_rowId"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/migrations/{id}/documents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["DataMigration_BulkEditDocuments_PUT_api_admin_migrations_id_documents"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/migrations/{id}/documents/{fileId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["DataMigration_EditDocument_PUT_api_admin_migrations_id_documents_fileId"];
        post: operations["DataMigration_Upload_POST_api_admin_migrations_id_documents_fileId"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/migrations/{id}/documents/{fileId}/content": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["DataMigration_Download_GET_api_admin_migrations_id_documents_fileId_content"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/operations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["AdminOperations_Get_GET_api_admin_operations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/settings/{key}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Admin_GetSetting_GET_api_admin_settings_key"];
        put: operations["Admin_PutSetting_PUT_api_admin_settings_key"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/smtp-verification": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["SmtpVerification_Status_GET_api_admin_smtp_verification"];
        put?: never;
        post: operations["SmtpVerification_Send_POST_api_admin_smtp_verification"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/smtp-verification/confirm": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["SmtpVerification_Confirm_POST_api_admin_smtp_verification_confirm"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/team-progress": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["TeamProgress_Get_GET_api_admin_team_progress"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Admin_GetUsers_GET_api_admin_users"];
        put?: never;
        post: operations["Admin_CreateUser_POST_api_admin_users"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/users/{id}/disable": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Admin_DisableUser_POST_api_admin_users_id_disable"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/users/{id}/enable": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Admin_EnableUser_POST_api_admin_users_id_enable"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/users/{id}/resend-invitation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Admin_ResendInvitation_POST_api_admin_users_id_resend_invitation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/users/{id}/reset-access": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Admin_ResetUserAccess_POST_api_admin_users_id_reset_access"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/users/{id}/reset-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Admin_ResetPassword_POST_api_admin_users_id_reset_password"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/users/{id}/revoke-sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Admin_RevokeSessions_POST_api_admin_users_id_revoke_sessions"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/users/{id}/role": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["Admin_UpdateUserRole_PUT_api_admin_users_id_role"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/users/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["Admin_UpdateUserStatus_PUT_api_admin_users_id_status"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/assignments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Assignments_GetAll_GET_api_assignments"];
        put?: never;
        post: operations["Assignments_Create_POST_api_assignments"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/assignments/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["Assignments_Delete_DELETE_api_assignments_id"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/assignments/{id}/make-primary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Assignments_MakePrimary_POST_api_assignments_id_make_primary"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/assignments/reassign": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Assignments_Reassign_POST_api_assignments_reassign"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/audit-logs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["AuditLogs_GetAll_GET_api_audit_logs"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/change-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Auth_ChangePassword_POST_api_auth_change_password"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/complete-invite": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Auth_CompleteInvite_POST_api_auth_complete_invite"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/csrf": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Obtain a CSRF token bound to the current cookie session. Send it as X-CSRF-Token on writes. */
        get: operations["Csrf_GetToken_GET_api_auth_csrf"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/forgot-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Auth_ForgotPassword_POST_api_auth_forgot_password"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Auth_Login_POST_api_auth_login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Auth_Logout_POST_api_auth_logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Auth_Me_GET_api_auth_me"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/mfa/verify": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Auth_VerifyMfa_POST_api_auth_mfa_verify"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/profile": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["Auth_UpdateProfile_PUT_api_auth_profile"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Auth_Refresh_POST_api_auth_refresh"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/security": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Auth_Security_GET_api_auth_security"];
        put: operations["Auth_UpdateSecurity_PUT_api_auth_security"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Auth_Sessions_GET_api_auth_sessions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/sessions/{sessionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["Auth_RevokeSession_DELETE_api_auth_sessions_sessionId"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/sessions/revoke-others": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Auth_RevokeOtherSessions_POST_api_auth_sessions_revoke_others"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/banking/connections/{connectionId}/disconnect": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Disconnect an authorized provider; rejected while integration is paused. */
        post: operations["Banking_Disconnect_POST_api_banking_connections_connectionId_disconnect"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/banking/connections/{connectionId}/sync": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Sync an authorized connection; rejected while integration is paused. */
        post: operations["Banking_Sync_POST_api_banking_connections_connectionId_sync"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/banking/manual/accounts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Register a manual ZAR business account; no bank consent or credentials are requested. */
        post: operations["Banking_AddManualAccount_POST_api_banking_manual_accounts"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/banking/manual/import": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Preview or confirm validated CSV transactions. Preview defaults to true. Import never certifies bank coverage or approves a monthly pack. */
        post: operations["Banking_ImportManualTransactions_POST_api_banking_manual_import"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/banking/monthly-pack-status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read manual statement readiness or bank coverage when direct integration is enabled. */
        get: operations["Banking_GetMonthlyPackStatus_GET_api_banking_monthly_pack_status"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/banking/overview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read accounts, retained transactions and import history for an authorized business. */
        get: operations["Banking_GetOverview_GET_api_banking_overview"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/banking/sandbox/connect": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Development-only sandbox connection; rejected while integration is paused. */
        post: operations["Banking_ConnectSandbox_POST_api_banking_sandbox_connect"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Clients": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Clients_GetAll_GET_api_Clients"];
        put?: never;
        post: operations["Clients_Create_POST_api_Clients"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Clients/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Clients_GetById_GET_api_Clients_id"];
        put: operations["Clients_Update_PUT_api_Clients_id"];
        post?: never;
        delete: operations["Clients_Delete_DELETE_api_Clients_id"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Clients/{id}/profile": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Clients_GetBusinessProfile_GET_api_Clients_id_profile"];
        put: operations["Clients_UpdateBusinessProfile_PUT_api_Clients_id_profile"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Clients/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["Clients_UpdateStatus_PUT_api_Clients_id_status"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/clients/onboarding": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ClientOnboarding_Create_POST_api_clients_onboarding"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/clients/onboarding/options": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ClientOnboarding_Options_GET_api_clients_onboarding_options"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/alerts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Compliance_GetAlerts_GET_api_compliance_alerts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/automation/obligations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ComplianceAutomation_Obligations_GET_api_compliance_automation_obligations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/automation/obligations/{id}/evidence": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ComplianceAutomation_Evidence_GET_api_compliance_automation_obligations_id_evidence"];
        put?: never;
        post: operations["ComplianceAutomation_Evidence_POST_api_compliance_automation_obligations_id_evidence"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/automation/obligations/{id}/not-applicable": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ComplianceAutomation_NotApplicable_POST_api_compliance_automation_obligations_id_not_applicable"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/automation/obligations/{id}/payment": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ComplianceAutomation_Payment_POST_api_compliance_automation_obligations_id_payment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/automation/obligations/{id}/preparation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ComplianceAutomation_Preparation_POST_api_compliance_automation_obligations_id_preparation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/automation/obligations/{id}/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ComplianceAutomation_Review_POST_api_compliance_automation_obligations_id_review"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/automation/obligations/{id}/submission": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ComplianceAutomation_Submission_POST_api_compliance_automation_obligations_id_submission"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/automation/profiles/{clientId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ComplianceAutomation_Profile_GET_api_compliance_automation_profiles_clientId"];
        put: operations["ComplianceAutomation_Profile_PUT_api_compliance_automation_profiles_clientId"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/automation/rules": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ComplianceAutomation_Rules_GET_api_compliance_automation_rules"];
        put: operations["ComplianceAutomation_Rules_PUT_api_compliance_automation_rules"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/automation/run": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ComplianceAutomation_Run_POST_api_compliance_automation_run"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Compliance_GetCategories_GET_api_compliance_categories"];
        put?: never;
        post: operations["Compliance_CreateCategory_POST_api_compliance_categories"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/categories/seed-defaults": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Compliance_SeedDefaultCategories_POST_api_compliance_categories_seed_defaults"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/evidence/{versionId}/download": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Compliance_DownloadEvidence_GET_api_compliance_evidence_versionId_download"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Compliance_GetHistory_GET_api_compliance_history"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Compliance_GetItems_GET_api_compliance_items"];
        put?: never;
        post: operations["Compliance_CreateItem_POST_api_compliance_items"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/items/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["Compliance_UpdateItem_PUT_api_compliance_items_id"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/items/{id}/evidence": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Compliance_GetEvidenceVersions_GET_api_compliance_items_id_evidence"];
        put?: never;
        post: operations["Compliance_UploadEvidence_POST_api_compliance_items_id_evidence"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/items/{id}/request": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Compliance_CreateWorkflowRequest_POST_api_compliance_items_id_request"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/monitoring/{clientId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ComplianceMonitoring_Get_GET_api_compliance_monitoring_clientId"];
        put: operations["ComplianceMonitoring_Update_PUT_api_compliance_monitoring_clientId"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/monitoring/{clientId}/authority-verifications/cipc": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ComplianceMonitoring_VerifyCipc_POST_api_compliance_monitoring_clientId_authority_verifications_cipc"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/monitoring/{clientId}/history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ComplianceMonitoring_History_GET_api_compliance_monitoring_clientId_history"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/monitoring/{clientId}/manual-verifications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ComplianceMonitoring_RecordManual_POST_api_compliance_monitoring_clientId_manual_verifications"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/reminders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Compliance_GetReminders_GET_api_compliance_reminders"];
        put?: never;
        post: operations["Compliance_CreateReminder_POST_api_compliance_reminders"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/reminders/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["Compliance_UpdateReminderStatus_PUT_api_compliance_reminders_id_status"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/compliance/reports/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Compliance_GetSummaryReport_GET_api_compliance_reports_summary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/document-slots": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["DocumentSlots_Create_POST_api_document_slots"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/document-slots/{monthlyPackId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["DocumentSlots_GetByMonthlyPackId_GET_api_document_slots_monthlyPackId"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/document-slots/{slotId}/approve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["DocumentSlots_Approve_POST_api_document_slots_slotId_approve"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/document-slots/{slotId}/not-applicable": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["DocumentSlots_MarkNotApplicable_POST_api_document_slots_slotId_not_applicable"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/document-slots/{slotId}/reject": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["DocumentSlots_Reject_POST_api_document_slots_slotId_reject"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/document-slots/{slotId}/request-reupload": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["DocumentSlots_RequestReupload_POST_api_document_slots_slotId_request_reupload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/document-slots/{slotId}/start-review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["DocumentSlots_StartReview_POST_api_document_slots_slotId_start_review"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/document-slots/{slotId}/submit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["DocumentSlots_Submit_POST_api_document_slots_slotId_submit"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/document-slots/{slotId}/upload": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["DocumentSlots_Upload_POST_api_document_slots_slotId_upload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/document-slots/{slotId}/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["DocumentSlots_GetVersions_GET_api_document_slots_slotId_versions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/document-slots/{slotId}/workspace": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["DocumentSlots_GetWorkspace_GET_api_document_slots_slotId_workspace"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/documents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Documents_GetAll_GET_api_documents"];
        put?: never;
        post: operations["Documents_Create_POST_api_documents"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/documents/{documentId}/invoice-review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["InvoiceReview_Get_GET_api_documents_documentId_invoice_review"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/documents/{documentId}/invoice-review/corrections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["InvoiceReview_Save_POST_api_documents_documentId_invoice_review_corrections"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/documents/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Documents_GetById_GET_api_documents_id"];
        put: operations["Documents_Update_PUT_api_documents_id"];
        post?: never;
        delete: operations["Documents_Delete_DELETE_api_documents_id"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/documents/{id}/archive-placement": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["DocumentArchive_Place_PUT_api_documents_id_archive_placement"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/documents/{id}/checklist-link": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["DocumentChecklist_Link_POST_api_documents_id_checklist_link"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/documents/{id}/comments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Documents_GetComments_GET_api_documents_id_comments"];
        put?: never;
        post: operations["Documents_AddComment_POST_api_documents_id_comments"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/documents/{id}/download": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Documents_Download_GET_api_documents_id_download"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/documents/{id}/request-reupload": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Documents_RequestReupload_POST_api_documents_id_request_reupload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/documents/{id}/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Documents_Review_POST_api_documents_id_review"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/documents/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["Documents_UpdateStatus_PUT_api_documents_id_status"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/documents/{id}/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Documents_GetVersions_GET_api_documents_id_versions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/documents/filing-register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Documents_GetFilingRegister_GET_api_documents_filing_register"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/documents/filing-rules": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Documents_GetFilingRules_GET_api_documents_filing_rules"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/documents/filing-rules/{category}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["Documents_UpdateFilingRule_PUT_api_documents_filing_rules_category"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/documents/upload": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Documents_UploadStream_POST_api_documents_upload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/firm-branding": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["FirmBranding_Get_GET_api_firm_branding"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/monthly-pack-profiles/{clientId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ClientMonthlyPackProfiles_Get_GET_api_monthly_pack_profiles_clientId"];
        put: operations["ClientMonthlyPackProfiles_Update_PUT_api_monthly_pack_profiles_clientId"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/monthly-pack-profiles/{clientId}/items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ClientMonthlyPackProfiles_AddItem_POST_api_monthly_pack_profiles_clientId_items"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/monthly-pack-profiles/{clientId}/reconcile-current-pack": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ClientMonthlyPackProfiles_ReconcileCurrentPack_POST_api_monthly_pack_profiles_clientId_reconcile_current_pack"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/monthly-pack-profiles/{clientId}/recurring/{requestId}/approve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ClientMonthlyPackProfiles_ApproveRecurring_POST_api_monthly_pack_profiles_clientId_recurring_requestId_approve"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/monthly-pack-profiles/{clientId}/recurring/{requestId}/decline": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ClientMonthlyPackProfiles_DeclineRecurring_POST_api_monthly_pack_profiles_clientId_recurring_requestId_decline"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/monthly-packs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["MonthlyPacks_GetAll_GET_api_monthly_packs"];
        put?: never;
        post: operations["MonthlyPacks_Create_POST_api_monthly_packs"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/monthly-packs/{clientId}/{year}/{month}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["MonthlyPacks_GetByClientAndPeriod_GET_api_monthly_packs_clientId_year_month"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/monthly-packs/{id}/close": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["MonthlyPacks_Close_POST_api_monthly_packs_id_close"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/monthly-packs/{id}/submit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["MonthlyPacks_Submit_POST_api_monthly_packs_id_submit"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/notifications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Notifications_GetMine_GET_api_notifications"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/notifications/{id}/mark-read": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Notifications_MarkAsRead_POST_api_notifications_id_mark_read"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/notifications/mark-all-read": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Notifications_MarkAllRead_POST_api_notifications_mark_all_read"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/notifications/preferences": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Notifications_GetPreferences_GET_api_notifications_preferences"];
        put: operations["Notifications_UpdatePreferences_PUT_api_notifications_preferences"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/platform/automation/run": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Automation_Run_POST_api_platform_automation_run"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/reports/accountants": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Reports_GetAccountantReports_GET_api_reports_accountants"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/reports/clients": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Reports_GetClientReports_GET_api_reports_clients"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/reports/compliance.pdf": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Reports_DownloadCompliancePdf_GET_api_reports_compliance_pdf"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/reports/firm": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Reports_GetFirmReports_GET_api_reports_firm"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/reports/operations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Reports_GetOperationsDashboard_GET_api_reports_operations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/reports/schedules": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Reports_GetSchedules_GET_api_reports_schedules"];
        put?: never;
        post: operations["Reports_CreateSchedule_POST_api_reports_schedules"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/reports/schedules/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["Reports_UpdateSchedule_PUT_api_reports_schedules_id"];
        post?: never;
        delete: operations["Reports_DeleteSchedule_DELETE_api_reports_schedules_id"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/requests": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Requests_GetAll_GET_api_requests"];
        put?: never;
        post: operations["Requests_Create_POST_api_requests"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/requests/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Requests_GetById_GET_api_requests_id"];
        put: operations["Requests_Update_PUT_api_requests_id"];
        post?: never;
        delete: operations["Requests_Delete_DELETE_api_requests_id"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/requests/{id}/comments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Requests_GetComments_GET_api_requests_id_comments"];
        put?: never;
        post: operations["Requests_AddComment_POST_api_requests_id_comments"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/requests/{id}/escalate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Requests_Escalate_POST_api_requests_id_escalate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/requests/{id}/read": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Requests_MarkRead_POST_api_requests_id_read"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/requests/{id}/resolve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Requests_Resolve_POST_api_requests_id_resolve"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/requests/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["Requests_UpdateStatus_PATCH_api_requests_id_status"];
        trace?: never;
    };
    "/api/requests/{id}/upload": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Requests_UploadStream_POST_api_requests_id_upload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/requests/{id}/workspace": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Requests_GetWorkspace_GET_api_requests_id_workspace"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/requests/read-state": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Requests_GetReadState_GET_api_requests_read_state"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/review-queue": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ReviewQueue_GetPending_GET_api_review_queue"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/review-queue/{documentId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ReviewQueue_GetWorkspace_GET_api_review_queue_documentId"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/review-queue/{documentId}/comments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ReviewQueue_AddComment_POST_api_review_queue_documentId_comments"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/review-queue/{documentId}/request-reupload": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ReviewQueue_RequestReupload_POST_api_review_queue_documentId_request_reupload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/review-queue/{documentId}/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ReviewQueue_Review_POST_api_review_queue_documentId_review"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Roles_GetAll_GET_api_roles"];
        put?: never;
        post: operations["Roles_Create_POST_api_roles"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/roles/{name}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["Roles_Update_PUT_api_roles_name"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/roles/{name}/activate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Roles_Activate_POST_api_roles_name_activate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/roles/{name}/deactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Roles_Deactivate_POST_api_roles_name_deactivate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/roles/access": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Roles_Access_GET_api_roles_access"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tasks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Tasks_GetAll_GET_api_tasks"];
        put?: never;
        post: operations["Tasks_Create_POST_api_tasks"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tasks/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Tasks_GetById_GET_api_tasks_id"];
        put: operations["Tasks_Update_PUT_api_tasks_id"];
        post?: never;
        delete: operations["Tasks_Delete_DELETE_api_tasks_id"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Users_GetAll_GET_api_users"];
        put?: never;
        post: operations["Users_Create_POST_api_users"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/users/{id}/activate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Users_Activate_POST_api_users_id_activate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/users/{id}/deactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Users_Deactivate_POST_api_users_id_deactivate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Health_GetServiceHealth_GET_health"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/health/db": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Health_GetDatabaseHealth_GET_health_db"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        "Microsoft.AspNetCore.Mvc.ValidationProblemDetails": {
            detail?: string | null;
            errors: {
                [key: string]: string[];
            };
            instance?: string | null;
            /** Format: int32 */
            status?: number | null;
            title?: string | null;
            type?: string | null;
        } & {
            [key: string]: unknown;
        };
        "SecureClientPortal.Backend.Api.Configuration.PortalApiProblem": {
            code: string;
            message: string;
            traceId: string;
        };
        "SecureClientPortal.Backend.Api.Modules.Auth.ConfirmSmtpRequest": {
            code: string;
        };
        "SecureClientPortal.Backend.Api.Modules.Auth.CsrfTokenResponse": {
            requestToken: string;
        };
        "SecureClientPortal.Backend.Api.Modules.Banking.BankingClientRequest": {
            /** Format: uuid */
            clientId?: string | null;
        };
        "SecureClientPortal.Backend.Api.Modules.Banking.BankingErrorResponse": {
            error: string;
        };
        "SecureClientPortal.Backend.Api.Modules.FirmManagement.FirmBrandingResponse": {
            firmName: string;
            logoDataUrl?: string | null;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Assignments.AssignmentHandoverRequest": {
            message: string;
            reason: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Assignments.AssignmentResponse": {
            accountantName?: string | null;
            /** Format: uuid */
            accountantUserId: string;
            /** Format: uuid */
            clientId: string;
            clientName?: string | null;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: uuid */
            id: string;
            isPrimary: boolean;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Assignments.CreateAssignmentRequest": {
            /** Format: uuid */
            accountantUserId: string;
            /** Format: uuid */
            clientId: string;
            handover?: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Assignments.AssignmentHandoverRequest"];
            isPrimary: boolean;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Assignments.ReassignAccountantRequest": {
            /** Format: uuid */
            clientId: string;
            /** Format: uuid */
            fromAccountantUserId: string;
            handover?: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Assignments.AssignmentHandoverRequest"];
            makePrimary: boolean;
            /** Format: uuid */
            toAccountantUserId: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Auth.ChangePasswordRequest": {
            currentPassword: string;
            nextPassword: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Auth.CompleteInviteRequest": {
            email: string;
            fullName: string;
            password: string;
            token: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Auth.ForgotPasswordRequest": {
            email: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Auth.LoginRequest": {
            email: string;
            password: string;
            rememberMe?: boolean;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Auth.MfaVerifyRequest": {
            challengeToken: string;
            code: string;
            useRecoveryCode?: boolean;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Auth.RefreshTokenRequest": {
            refreshToken?: string | null;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Auth.UpdateProfileRequest": {
            fullName: string;
            phone?: string | null;
            title?: string | null;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Auth.UpdateSecuritySettingsRequest": {
            recoveryEmail?: string | null;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Clients.OnboardClientRequest": {
            /** Format: uuid */
            accountantUserId: string;
            contactEmail: string;
            contactName: string;
            entityType: string;
            /** Format: uuid */
            existingClientUserId?: string | null;
            industry: string;
            name: string;
            registrationNumber?: string | null;
            /** Format: uuid */
            requestId: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Clients.UpdateClientBusinessProfileRequest": {
            addressLine: string;
            city: string;
            country: string;
            financeEmail: string;
            industry: string;
            legalName: string;
            phone: string;
            primaryContact: string;
            primaryContactJobTitle: string;
            registrationNumber: string;
            taxNumber: string;
            tradingName: string;
            vatNumber: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Clients.UpdateClientStatusRequest": {
            status: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.CheckApplicabilityRequest": {
            applicability: string;
            checkCode: string;
            reason: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ClientComplianceProfile": {
            cipcRegistered?: boolean | null;
            /** Format: uuid */
            clientId?: string;
            coidaRegistered?: boolean | null;
            companyTaxRegistered?: boolean | null;
            csdRegistered?: boolean | null;
            csdSupplierNumber?: string | null;
            /** Format: int32 */
            financialYearEndMonth?: number;
            governmentSupplier?: boolean | null;
            payeRegistered?: boolean | null;
            provisionalTaxpayer?: boolean | null;
            uifRegistered?: boolean | null;
            /** Format: date-time */
            updatedAtUtc?: string | null;
            /** Format: int32 */
            vatAnchorMonth?: number;
            /** Format: int32 */
            vatCycleMonths?: number;
            vatRegistered?: boolean | null;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceRuleDefinition": {
            applicabilityField: string;
            authority: string;
            /** Format: int32 */
            cadenceMonths: number;
            categoryCode: string;
            code: string;
            /** Format: int32 */
            dueDayOfMonth?: number | null;
            /** Format: int32 */
            dueOffsetMonths: number;
            /** Format: date-time */
            effectiveFromUtc: string;
            /** Format: date-time */
            effectiveToUtc?: string | null;
            name: string;
            requiredDocumentCategories: string[];
            requiresPayment: boolean;
            requiresSubmission: boolean;
            version: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.CreateComplianceCategoryRequest": {
            code?: string | null;
            description: string;
            isActive?: boolean;
            name: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.CreateComplianceItemRequest": {
            /** Format: uuid */
            categoryId: string;
            /** Format: uuid */
            clientId: string;
            /** Format: date-time */
            dueDateUtc?: string | null;
            /** Format: date-time */
            expiryDateUtc?: string | null;
            name: string;
            /** Format: uuid */
            ownerUserId?: string | null;
            requiredDocumentCategory?: string | null;
            riskLevel: string;
            status: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.CreateComplianceReminderRequest": {
            /** Format: uuid */
            complianceItemId: string;
            /** Format: uuid */
            recipientUserId: string;
            /** Format: date-time */
            scheduledForUtc: string;
            type: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.CreateComplianceWorkflowRequest": {
            comments?: string | null;
            /** Format: date-time */
            dueDateUtc?: string | null;
            requestType: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.NotApplicableRequest": {
            reason: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.PaymentRequest": {
            /** Format: double */
            amountPaid: number;
            note?: string | null;
            /** Format: date-time */
            paidAtUtc: string;
            paymentReference: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.PreparationRequest": {
            complete: boolean;
            note?: string | null;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.RecordManualVerificationRequest": {
            checkCode: string;
            /** Format: date-time */
            checkedAtUtc: string;
            evidenceReference: string;
            outcome: string;
            /** Format: date-time */
            reviewAfterUtc: string;
            /** Format: uuid */
            version: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ReviewObligationRequest": {
            approved: boolean;
            note?: string | null;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.RunAuthorityVerificationRequest": {
            checkCode: string;
            /** Format: uuid */
            version: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.SubmissionRequest": {
            /** Format: double */
            amountPayable?: number | null;
            /** Format: double */
            amountRefundable?: number | null;
            note?: string | null;
            paymentRequired: boolean;
            submissionReference: string;
            /** Format: date-time */
            submittedAtUtc: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.UpdateComplianceItemRequest": {
            /** Format: date-time */
            dueDateUtc?: string | null;
            /** Format: date-time */
            expiryDateUtc?: string | null;
            /** Format: uuid */
            linkedDocumentId?: string | null;
            name: string;
            /** Format: uuid */
            ownerUserId?: string | null;
            requiredDocumentCategory?: string | null;
            riskLevel: string;
            status: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.UpdateComplianceMonitoringRequest": {
            checks: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.CheckApplicabilityRequest"][];
            csdSupplierNumber: string;
            registrationNumber: string;
            taxNumber: string;
            /** Format: uuid */
            version: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.UpdateComplianceReminderStatusRequest": {
            status: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.UpdateComplianceRulesRequest": {
            rules: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceRuleDefinition"][];
            version: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Documents.AddDocumentCommentRequest": {
            message: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Documents.AddReviewDecisionRequest": {
            decision: string;
            internalNote?: string | null;
            invoiceReview?: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewContext"];
            reason?: string | null;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Documents.ArchivePlacementRequest": {
            /** Format: int32 */
            expectedDocumentVersion: number;
            /** Format: int32 */
            month?: number | null;
            scope: string;
            /** Format: int32 */
            year?: number | null;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Documents.ArchivePlacementResponse": {
            /** Format: int32 */
            month?: number | null;
            scope: string;
            /** Format: int32 */
            year?: number | null;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Documents.CreateDocumentRequest": {
            category: string;
            /** Format: uuid */
            clientId: string;
            /** Format: uuid */
            documentSlotId?: string | null;
            fileType: string;
            /** Format: uuid */
            monthlyPackId: string;
            name: string;
            /** Format: int64 */
            sizeBytes: number;
            status: string;
            storageKey?: string | null;
            /** Format: uuid */
            uploadedByUserId: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Documents.FilingRuleUpdateRequest": {
            isEnabled: boolean;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewContext": {
            /** Format: int32 */
            expectedRevision: number;
            /** Format: int32 */
            expectedVersionNumber: number;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewEvidence": {
            /** Format: double */
            confidence?: number | null;
            field: string;
            /** Format: double */
            height: number;
            /** Format: int32 */
            pageIndex?: number;
            text: string;
            /** Format: double */
            width: number;
            /** Format: double */
            x: number;
            /** Format: double */
            y: number;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewFinding": {
            fields: string[];
            id: string;
            message: string;
            /** Format: uuid */
            relatedDocumentId?: string | null;
            relatedDocumentName?: string | null;
            result: string;
            rule: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewHistory": {
            /** Format: uuid */
            actorUserId: string;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: uuid */
            id: string;
            lineItems?: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewLineItem"][] | null;
            lineItemsConfirmed?: boolean;
            reviewNote?: string | null;
            /** Format: int32 */
            revision: number;
            source: string;
            values: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewValues"];
            /** Format: int32 */
            versionNumber: number;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewLineItem": {
            description: string;
            discount: string;
            netTotal: string;
            quantity: string;
            unitPrice: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewResponse": {
            canAccept: boolean;
            /** Format: uuid */
            documentId: string;
            evidence: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewEvidence"][];
            findings: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewFinding"][];
            history: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewHistory"][];
            isStale: boolean;
            legacyAmount?: string | null;
            lineItems?: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewLineItem"][] | null;
            lineItemsConfirmed?: boolean;
            /** Format: int32 */
            month: number;
            originalConfirmed: boolean;
            reviewNote?: string | null;
            /** Format: int32 */
            revision: number;
            ruleSetVersion: string;
            state: string;
            suggestions?: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewValues"];
            values: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewValues"];
            /** Format: int32 */
            versionNumber: number;
            /** Format: int32 */
            year: number;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewValues": {
            adjustments: string;
            allAdjustmentsAccountedFor: boolean;
            amountDue: string;
            currency: string;
            invoiceDate: string;
            invoiceNumber: string;
            invoiceTotal: string;
            subtotal: string;
            supplierName: string;
            vatAmount: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Documents.LinkDocumentChecklistRequest": {
            /** Format: uuid */
            documentSlotId: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Documents.RequestReuploadRequest": {
            internalNote?: string | null;
            reason: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Documents.SaveInvoiceReviewRequest": {
            evidence: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewEvidence"][];
            /** Format: int32 */
            expectedRevision: number;
            /** Format: int32 */
            expectedVersionNumber: number;
            lineItems?: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewLineItem"][] | null;
            lineItemsConfirmed?: boolean;
            originalConfirmed: boolean;
            /** Format: uuid */
            requestId: string;
            reviewNote?: string | null;
            source: string;
            suggestions?: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewValues"];
            values: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewValues"];
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Documents.UpdateDocumentRequest": {
            category: string;
            name: string;
            /** Format: int64 */
            sizeBytes: number;
            status: string;
            storageKey?: string | null;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Documents.UpdateDocumentStatusRequest": {
            invoiceReview?: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewContext"];
            status: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Documents.UploadDocumentRequest": {
            allowDuplicate?: boolean;
            /** Format: uuid */
            clientId: string;
            detailsConfirmed?: boolean;
            displayName?: string | null;
            /** Format: uuid */
            documentId?: string | null;
            /** Format: uuid */
            documentSlotId?: string | null;
            documentType: string;
            /** Format: binary */
            file: Blob;
            invoiceDetailsJson?: string | null;
            /** Format: uuid */
            monthlyPackId?: string | null;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.DeadlineRuleDto": {
            /** Format: int32 */
            dueDayOfMonth: number;
            /** Format: int32 */
            graceDays: number;
            /** Format: uuid */
            id: string;
            isEnabled: boolean;
            name: string;
            priority: string;
            scope: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.EscalationRuleDto": {
            action: string;
            /** Format: int32 */
            daysAfterDue: number;
            escalateToRole: string;
            /** Format: uuid */
            id: string;
            isEnabled: boolean;
            name: string;
            triggerType: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.MonthlyPackTemplateDto": {
            /** Format: int32 */
            autoCreateDayOfMonth: number;
            description: string;
            /** Format: uuid */
            id: string;
            name: string;
            requiredDocumentTemplateIds: string[];
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.ReminderRuleDto": {
            audienceRole: string;
            /** Format: int32 */
            daysBeforeDue: number;
            /** Format: uuid */
            id: string;
            isEnabled: boolean;
            messageTemplate: string;
            name: string;
            triggerType: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.RequestTemplateDto": {
            /** Format: int32 */
            defaultDueInDays?: number | null;
            descriptionTemplate: string;
            /** Format: uuid */
            id: string;
            name: string;
            priority: string;
            requestType: string;
            titleTemplate: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.RequiredDocumentTemplateDto": {
            /** Format: int32 */
            defaultDueDayOfMonth?: number | null;
            description: string;
            documentCategory: string;
            /** Format: uuid */
            id: string;
            isRequired: boolean;
            name: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Migration.ApproveMigrationRequest": {
            confirmOwnershipAndPeriods: boolean;
            /** Format: int32 */
            version: number;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Migration.BulkMigrationDocumentRequest": {
            category?: string | null;
            /** Format: uuid */
            clientId: string;
            confirmOwnershipAndPeriods: boolean;
            historicalNotes?: string | null;
            historicalStatusConfirmed: boolean;
            /** Format: int32 */
            month?: number | null;
            previouslyFiled: boolean;
            /** Format: date-time */
            previousReviewDateUtc?: string | null;
            previousReviewer?: string | null;
            recordScope?: string;
            /** Format: int32 */
            version: number;
            /** Format: int32 */
            year?: number | null;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Migration.CreateMigrationRequest": {
            name: string;
            /** Format: uuid */
            requestId: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Migration.EditMigrationClientRequest": {
            skip: boolean;
            useExistingClient?: boolean;
            values: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationClientInput"];
            /** Format: int32 */
            version: number;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Migration.EditMigrationDocumentRequest": {
            values: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationDocumentInput"];
            /** Format: int32 */
            version: number;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail": {
            archiveWarnings?: string[] | null;
            clients: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationClientRow"][];
            documents: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationDocumentRow"][];
            summary: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationSummary"];
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationClientInput": {
            accountantEmail: string;
            contactEmail: string;
            contactName: string;
            entityType: string;
            industry: string;
            name: string;
            registrationNumber: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationClientRow": {
            errors: string[];
            /** Format: uuid */
            existingClientId?: string | null;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            importedId?: string | null;
            skip: boolean;
            /** Format: int32 */
            sourceRow: number;
            useExistingClient?: boolean;
            values: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationClientInput"];
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationDocumentInput": {
            category: string;
            /** Format: uuid */
            clientId?: string | null;
            displayName: string;
            duplicateAcknowledged: boolean;
            historicalNotes?: string | null;
            historicalStatusConfirmed?: boolean;
            /** Format: int32 */
            month?: number | null;
            ownershipConfirmed: boolean;
            previouslyFiled?: boolean;
            /** Format: date-time */
            previousReviewDateUtc?: string | null;
            previousReviewer?: string | null;
            recordScope?: string;
            skip: boolean;
            sourcePath?: string | null;
            /** Format: int32 */
            year?: number | null;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationDocumentRow": {
            errors: string[];
            fileName: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            importedId?: string | null;
            /** Format: int64 */
            sizeBytes: number;
            values: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationDocumentInput"];
            warnings: string[];
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationSummary": {
            /** Format: int32 */
            clientRows: number;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: int32 */
            documents: number;
            /** Format: uuid */
            id: string;
            /** Format: int32 */
            importedClients: number;
            /** Format: int32 */
            importedDocuments: number;
            /** Format: int32 */
            linkedClients?: number;
            name: string;
            status: string;
            /** Format: date-time */
            updatedAtUtc: string;
            /** Format: int32 */
            version: number;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.AddClientMonthlyPackItemRequest": {
            category?: string | null;
            /** Format: date-time */
            dueDateUtc?: string | null;
            isRequired: boolean;
            label: string;
            recurrence: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.ApproveDocumentSlotRequest": {
            internalNote?: string | null;
            invoiceReview?: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewContext"];
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.ClientMonthlyPackProfileItemInput": {
            cadence?: string;
            category: string;
            /** Format: int32 */
            defaultDueDayOfMonth?: number | null;
            /** Format: date-time */
            effectiveFromUtc?: string | null;
            /** Format: date-time */
            effectiveToUtc?: string | null;
            isRequired: boolean;
            label: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.ClientOperatingProfileInput": {
            bankFeedConnected?: boolean;
            hasEmployees?: boolean | null;
            holdsInventory?: boolean | null;
            manufacturesGoods?: boolean | null;
            operatesFleet?: boolean | null;
            purchaseInvoicesSynced?: boolean;
            salesInvoicesSynced?: boolean;
            tracksProjectCosts?: boolean | null;
            usesBookingPlatforms?: boolean | null;
            usesFoodSuppliers?: boolean | null;
            usesPaymentCertificates?: boolean | null;
            usesPos?: boolean | null;
            usesSubcontractors?: boolean | null;
            usesSupplierAccounts?: boolean | null;
            /** Format: int32 */
            vatAnchorMonth?: number;
            /** Format: int32 */
            vatCycleMonths?: number;
            vatRegistered?: boolean | null;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.CreateDocumentSlotRequest": {
            category: string;
            /** Format: date-time */
            dueDateUtc?: string | null;
            isRequired: boolean;
            label: string;
            /** Format: uuid */
            monthlyPackId: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.CreateMonthlyPackRequest": {
            /** Format: uuid */
            clientId: string;
            /** Format: int32 */
            month: number;
            status?: string | null;
            /** Format: int32 */
            year: number;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.DocumentSlotResponse": {
            canSubmit: boolean;
            category: string;
            /** Format: uuid */
            clientId: string;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: uuid */
            currentDocumentId?: string | null;
            /** Format: date-time */
            dueDateUtc?: string | null;
            /** Format: uuid */
            id: string;
            isRequired: boolean;
            label: string;
            /** Format: uuid */
            monthlyPackId: string;
            rejectionReason?: string | null;
            reviewStatus: string;
            status: string;
            /** Format: date-time */
            submittedAtUtc?: string | null;
            /** Format: uuid */
            submittedByUserId?: string | null;
            /** Format: date-time */
            updatedAtUtc: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.MonthlyPackResponse": {
            /** Format: uuid */
            clientId: string;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: uuid */
            id: string;
            /** Format: int32 */
            month: number;
            status: string;
            /** Format: date-time */
            updatedAtUtc: string;
            /** Format: int32 */
            year: number;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.RejectDocumentSlotRequest": {
            internalNote?: string | null;
            reason: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.RequestDocumentSlotReuploadRequest": {
            internalNote?: string | null;
            reason: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.StartDocumentSlotReviewRequest": {
            internalNote?: string | null;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.UpdateClientMonthlyPackProfileRequest": {
            /** Format: date-time */
            effectiveFromUtc?: string | null;
            operatingProfile?: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.ClientOperatingProfileInput"];
            reconcileCurrentPack?: boolean;
            recurringItems: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.ClientMonthlyPackProfileItemInput"][];
            /** Format: uuid */
            templateId?: string | null;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Notifications.UpdateNotificationPreferenceRequest": {
            browserAlerts: boolean;
            complianceAlerts: boolean;
            deadlineAlerts: boolean;
            emailReminders: boolean;
            escalationAlerts: boolean;
            quietHours: string;
            rejectionAlerts: boolean;
            weeklySummary: boolean;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Reports.CreateReportScheduleRequest": {
            /** Format: uuid */
            clientId?: string | null;
            frequency: string;
            recipients: string[];
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Reports.UpdateReportScheduleRequest": {
            frequency: string;
            recipients: string[];
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Requests.AddRequestCommentRequest": {
            isInternal?: boolean;
            message: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Requests.CreateRequestRequest": {
            /** Format: uuid */
            clientId: string;
            description: string;
            /** Format: date-time */
            dueDateUtc?: string | null;
            priority: string;
            /** Format: uuid */
            relatedDocumentId?: string | null;
            requestType: string;
            title: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Requests.EscalateRequestRequest": {
            escalateToRole?: string | null;
            reason?: string | null;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Requests.ResolveRequestRequest": {
            resolutionNote?: string | null;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Requests.UpdateRequestRequest": {
            description: string;
            /** Format: date-time */
            dueDateUtc?: string | null;
            priority: string;
            /** Format: uuid */
            relatedDocumentId?: string | null;
            requestType: string;
            status: string;
            title: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Requests.UpdateRequestStatusRequest": {
            status: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.Requests.UploadRequestDocumentRequest": {
            /** Format: binary */
            file: Blob;
            message?: string | null;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.ReviewQueue.ReviewQueueItemResponse": {
            /** Format: int32 */
            assistantAttentionCount?: number;
            assistantState?: string | null;
            /** Format: int32 */
            assistantUnverifiedCount?: number;
            /** Format: uuid */
            clientId: string;
            clientName: string;
            /** Format: int32 */
            currentVersionNumber: number;
            documentCategory: string;
            /** Format: uuid */
            documentId: string;
            documentName: string;
            /** Format: uuid */
            documentSlotId?: string | null;
            documentStatus: string;
            /** Format: int32 */
            month?: number | null;
            /** Format: uuid */
            monthlyPackId?: string | null;
            rejectionReason?: string | null;
            /** Format: int32 */
            reviewAgeDays: number;
            reviewPriority: string;
            slotLabel?: string | null;
            slotStatus?: string | null;
            /** Format: date-time */
            submittedAtUtc?: string | null;
            /** Format: date-time */
            uploadedAtUtc: string;
            /** Format: int32 */
            year?: number | null;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AccountantProgress": {
            /** Format: uuid */
            accountantId: string;
            accountStatus: string;
            /** Format: int32 */
            approvedItems: number;
            /** Format: int32 */
            awaitingReview: number;
            /** Format: int32 */
            backupClients: number;
            clients: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.ClientWorkProgress"][];
            /** Format: int32 */
            decisionsToday: number;
            /** Format: int32 */
            inReview: number;
            latestActivity?: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.TeamActivity"];
            name: string;
            /** Format: int32 */
            primaryClients: number;
            /** Format: int32 */
            requiredItems: number;
            /** Format: int32 */
            waitingOnClient: number;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminCreateUserRequest": {
            company?: string | null;
            email: string;
            fullName: string;
            role: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminOperationsResponse": {
            accessEmailEnabled: boolean;
            automationEnabled: boolean;
            automationLastRun?: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.OperationResult"];
            /** Format: date-time */
            checkedAtUtc: string;
            deploymentMode: string;
            /** Format: int32 */
            emailFailed: number;
            /** Format: int32 */
            emailPending: number;
            lastBackup?: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.OperationResult"];
            lastRestore?: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.OperationResult"];
            /** Format: int32 */
            missingDocuments: number;
            notificationEmailEnabled: boolean;
            /** Format: int32 */
            overdueDocuments: number;
            /** Format: int32 */
            overdueRequests: number;
            /** Format: int32 */
            packsClosed: number;
            /** Format: int32 */
            packsUnderReview: number;
            storageAvailable: boolean;
            /** Format: int64 */
            storageBytes?: number | null;
            /** Format: int64 */
            storageQuotaBytes: number;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminResetAccessRequest": {
            reason: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminResetPasswordRequest": {
            newPassword?: string | null;
            reason?: string | null;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminSettingRequest": {
            valueJson: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminUpdateRoleRequest": {
            role: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminUpdateStatusRequest": {
            status: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.ClientWorkProgress": {
            assignment: string;
            /** Format: uuid */
            clientId: string;
            clientName: string;
            packs: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.PackProgress"][];
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.CreateRoleRequest": {
            displayName: string;
            name: string;
            permissions?: string[] | null;
            scope: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.CreateUserRequest": {
            clientIds?: string[] | null;
            company?: string | null;
            email: string;
            fullName: string;
            password?: string | null;
            role: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.OperationResult": {
            /** Format: date-time */
            atUtc: string;
            status: string;
            verified?: boolean;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.PackProgress": {
            /** Format: int32 */
            approvedItems: number;
            /** Format: int32 */
            awaitingReview: number;
            /** Format: int32 */
            inReview: number;
            /** Format: int32 */
            month: number;
            /** Format: uuid */
            packId: string;
            /** Format: int32 */
            requiredItems: number;
            status: string;
            /** Format: int32 */
            waitingOnClient: number;
            /** Format: int32 */
            year: number;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.RoleManagementAccess": {
            canActivate: boolean;
            canCreate: boolean;
            canDeactivate: boolean;
            canUpdate: boolean;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.RoleResponse": {
            configuredPermissions: string[];
            /** Format: date-time */
            createdAtUtc: string;
            displayName: string;
            isActive: boolean;
            isSystemRole: boolean;
            name: string;
            permissions: string[];
            scope: string;
            /** Format: date-time */
            updatedAtUtc: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.TeamActivity": {
            action: string;
            /** Format: date-time */
            atUtc: string;
            clientName?: string | null;
            documentName?: string | null;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.TeamProgressResponse": {
            accountants: components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AccountantProgress"][];
            /** Format: date-time */
            checkedAtUtc: string;
            /** Format: int32 */
            unassignedClients: number;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.UpdateRoleRequest": {
            displayName?: string | null;
            permissions?: string[] | null;
            scope: string;
        };
        "SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.UpdateUserActivationRequest": {
            isActive: boolean;
            reason?: string | null;
        };
        "SecureClientPortal.Backend.Application.Modules.Banking.BankAccountDto": {
            accountName: string;
            accountNumberMasked: string;
            accountType: string;
            /** Format: double */
            availableBalance: number | null;
            /** Format: uuid */
            bankConnectionId: string;
            bankName: string;
            currency: string;
            /** Format: double */
            currentBalance: number | null;
            /** Format: uuid */
            id: string;
            /** Format: date-time */
            lastUpdatedAtUtc: string;
        };
        "SecureClientPortal.Backend.Application.Modules.Banking.BankConnectionDto": {
            /** Format: uuid */
            clientId: string;
            /** Format: date-time */
            connectedAtUtc: string;
            /** Format: date-time */
            consentExpiresAtUtc: string | null;
            /** Format: date-time */
            disconnectedAtUtc: string | null;
            failureReason: string | null;
            /** Format: uuid */
            id: string;
            /** Format: date-time */
            lastSyncedAtUtc: string | null;
            provider: string;
            status: string;
        };
        "SecureClientPortal.Backend.Application.Modules.Banking.BankingOverviewDto": {
            accounts: components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankAccountDto"][];
            /** Format: uuid */
            clientId: string;
            connections: components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankConnectionDto"][];
            integrationEnabled: boolean;
            recentTransactions: components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankTransactionDto"][];
            sandboxEnabled: boolean;
            syncRuns: components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankSyncRunDto"][];
        };
        "SecureClientPortal.Backend.Application.Modules.Banking.BankSyncRunDto": {
            /** Format: uuid */
            bankConnectionId: string;
            errorMessage: string | null;
            /** Format: date-time */
            finishedAtUtc: string | null;
            /** Format: date-time */
            fromDateUtc: string | null;
            /** Format: uuid */
            id: string;
            provider: string;
            /** Format: date-time */
            startedAtUtc: string;
            status: string;
            /** Format: date-time */
            toDateUtc: string | null;
            /** Format: int32 */
            transactionsReceived: number;
        };
        "SecureClientPortal.Backend.Application.Modules.Banking.BankTransactionDto": {
            /** Format: double */
            amount: number;
            /** Format: double */
            balance: number | null;
            /** Format: uuid */
            bankAccountId: string;
            description: string;
            direction: string;
            /** Format: uuid */
            id: string;
            /** Format: date-time */
            postedDateUtc: string | null;
            providerCategory: string;
            reference: string;
            /** Format: date-time */
            transactionDateUtc: string;
        };
        "SecureClientPortal.Backend.Application.Modules.Banking.ManualBankAccountRequest": {
            accountName: string;
            bankName: string;
            /** Format: uuid */
            clientId?: string | null;
            lastFourDigits: string;
            /** Format: uuid */
            registrationId: string;
        };
        "SecureClientPortal.Backend.Application.Modules.Banking.ManualTransactionImportRequest": {
            /** Format: uuid */
            accountId: string;
            preview?: boolean;
            rows: components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.ManualTransactionRow"][];
            sourceName: string;
        };
        "SecureClientPortal.Backend.Application.Modules.Banking.ManualTransactionImportResult": {
            /** Format: double */
            credits: number;
            /** Format: double */
            debits: number;
            /** Format: int32 */
            duplicates: number;
            /** Format: int32 */
            imported: number;
            preview: boolean;
            /** Format: int32 */
            totalRows: number;
        };
        "SecureClientPortal.Backend.Application.Modules.Banking.ManualTransactionRow": {
            /** Format: double */
            amount: number;
            /** Format: double */
            balance?: number | null;
            date: string;
            description: string;
            reference: string;
        };
        "SecureClientPortal.Backend.Application.Modules.Banking.MonthlyPackBankingStatusDto": {
            /** Format: uuid */
            clientId: string;
            /** Format: int32 */
            connectedAccountCount: number;
            /** Format: date-time */
            dataFromUtc: string | null;
            /** Format: date-time */
            dataThroughUtc: string | null;
            hasActiveConnection: boolean;
            isPeriodComplete: boolean;
            message: string;
            /** Format: date-time */
            missingFromUtc: string | null;
            /** Format: date-time */
            missingToUtc: string | null;
            /** Format: int32 */
            month: number;
            /** Format: date-time */
            periodEndUtc: string;
            /** Format: date-time */
            periodStartUtc: string;
            /** Format: date-time */
            requiredThroughUtc: string;
            status: string;
            /** Format: int32 */
            year: number;
        };
        "SecureClientPortal.Backend.Domain.Modules.MonthlyPacks.DocumentSlot": {
            readonly canCurrentlyBeSubmitted: boolean;
            readonly category: string;
            /** Format: uuid */
            readonly clientId: string;
            /** Format: date-time */
            readonly createdAtUtc: string;
            /** Format: uuid */
            readonly currentDocumentId: string | null;
            /** Format: date-time */
            readonly dueDateUtc: string | null;
            /** Format: uuid */
            readonly id: string;
            readonly isRequired: boolean;
            readonly label: string;
            /** Format: uuid */
            readonly monthlyPackId: string;
            readonly rejectionReason: string | null;
            readonly reviewStatus: string;
            readonly status: string;
            /** Format: date-time */
            readonly submittedAtUtc: string | null;
            /** Format: uuid */
            readonly submittedByUserId: string | null;
            /** Format: date-time */
            readonly updatedAtUtc: string;
        };
        "SecureClientPortal.Backend.Models.AuditLog": {
            readonly action: string;
            readonly actorRole: string;
            /** Format: uuid */
            readonly actorUserId: string | null;
            /** Format: uuid */
            readonly clientId: string | null;
            /** Format: date-time */
            readonly createdAtUtc: string;
            /** Format: uuid */
            readonly entityId: string;
            readonly entityType: string;
            /** Format: uuid */
            readonly id: string;
            readonly metadataJson: string | null;
        };
        "SecureClientPortal.Backend.Models.Client": {
            readonly addressLine: string;
            /** Format: uuid */
            readonly assignedAccountantId: string;
            readonly city: string;
            /** Format: int32 */
            readonly complianceHealth: number;
            readonly country: string;
            /** Format: date-time */
            readonly createdAtUtc: string;
            readonly email: string;
            readonly entityType: string;
            /** Format: uuid */
            readonly id: string;
            readonly industry: string;
            readonly name: string;
            readonly phone: string;
            readonly primaryContact: string;
            readonly primaryContactJobTitle: string;
            readonly registrationNumber: string;
            readonly status: string;
            readonly taxNumber: string;
            readonly tradingName: string;
            /** Format: date-time */
            readonly updatedAtUtc: string;
            readonly vatNumber: string;
        };
        "SecureClientPortal.Backend.Models.Notification": {
            /** Format: uuid */
            readonly clientId: string | null;
            /** Format: date-time */
            readonly createdAtUtc: string;
            /** Format: uuid */
            readonly id: string;
            readonly isRead: boolean;
            readonly linkUrl: string | null;
            readonly message: string;
            /** Format: date-time */
            readonly readAtUtc: string | null;
            readonly title: string;
            readonly type: string;
            /** Format: uuid */
            readonly userId: string;
        };
        "SecureClientPortal.Backend.Models.RequestComment": {
            readonly authorRole: string;
            /** Format: uuid */
            readonly authorUserId: string;
            /** Format: uuid */
            readonly clientId: string;
            /** Format: date-time */
            readonly createdAtUtc: string;
            /** Format: uuid */
            readonly id: string;
            readonly isInternal: boolean;
            readonly message: string;
            /** Format: uuid */
            readonly requestId: string;
        };
        "SecureClientPortal.Backend.Models.RequestItem": {
            /** Format: uuid */
            readonly clientId: string;
            readonly description: string;
            /** Format: date-time */
            readonly dueDateUtc: string | null;
            /** Format: uuid */
            readonly id: string;
            readonly priority: string;
            /** Format: uuid */
            readonly relatedDocumentId: string | null;
            /** Format: date-time */
            readonly requestedAtUtc: string;
            /** Format: uuid */
            readonly requestedByUserId: string;
            readonly requestType: string;
            /** Format: date-time */
            readonly resolvedAtUtc: string | null;
            /** Format: uuid */
            readonly resolvedByUserId: string | null;
            readonly status: string;
            readonly title: string;
            /** Format: date-time */
            readonly updatedAtUtc: string;
        };
        "SecureClientPortal.Backend.Models.TaskItem": {
            /** Format: uuid */
            readonly clientId: string;
            /** Format: date-time */
            readonly createdAtUtc: string;
            /** Format: uuid */
            readonly createdByUserId: string;
            /** Format: date-time */
            readonly dueDateUtc: string | null;
            /** Format: uuid */
            readonly id: string;
            readonly priority: string;
            readonly status: string;
            readonly title: string;
            /** Format: date-time */
            readonly updatedAtUtc: string;
        };
        "Source.Anonymous_0BE56803BB372A56": {
            categories: components["schemas"]["Source.Anonymous_EF96CBDA05C87888"][];
            /** Format: uuid */
            clientId: string;
            complianceScore: number;
            criticalRisk: number;
            expired: number;
            expiringSoon: number;
            highRisk: number;
            missing: number;
            pending: number;
            rejected: number;
            total: number;
            valid: number;
        };
        "Source.Anonymous_0C101232BACA38B2": {
            averageHours: number;
            totalReviews: number;
        };
        "Source.Anonymous_2AC1D50ADB77B99E": {
            /** Format: uuid */
            accountantUserId: string;
            /** Format: uuid */
            clientId: string;
            /** Format: uuid */
            id: string;
            isPrimary: boolean;
        };
        "Source.Anonymous_2CA2AB48C709BFD7": {
            criticalRisk: number;
            expired: number;
            expiringSoon: number;
            highRisk: number;
            missing: number;
            totalItems: number;
            valid: number;
        };
        "Source.Anonymous_2CAE675DE909CC14": {
            seeded: number;
        };
        "Source.Anonymous_3AAA36BBF54EB7BB": {
            delivery: string;
            message: string;
            ok: boolean;
        };
        "Source.Anonymous_3EB22849C2884330": {
            accountantName: string;
            /** Format: uuid */
            accountantUserId: string;
            assignedClients: number;
            reviewTime: components["schemas"]["Source.Anonymous_0C101232BACA38B2"];
            workload: components["schemas"]["Source.Anonymous_B76B43B256327061"];
        };
        "Source.Anonymous_4CC13E8555A2BFC8": {
            challengeToken: string;
            /** Format: date-time */
            expiresAtUtc: string | null;
            mfaRequired: boolean;
            setupKey: string;
        };
        "Source.Anonymous_5BA45F232671B497": {
            criticalComplianceItems: number;
            /** Format: uuid */
            id: string;
            name: string;
            openOverdueRequests: number;
        };
        "Source.Anonymous_5D788E0C4C4ECE98": {
            clientIds: string[];
            company: string;
            email: string;
            fullName: string;
            /** Format: uuid */
            id: string;
            permissions: string[];
            phone: string;
            role: string;
            roleScope: string;
            title: string;
        };
        "Source.Anonymous_5E407DA0541982CE": {
            email: string;
            fullName: string;
            /** Format: uuid */
            id: string;
            profileJson: string | null;
            role: string;
            securityJson: string | null;
            securityStatus: string;
        };
        "Source.Anonymous_6F4CA6E344941AF7": {
            message: string;
        };
        "Source.Anonymous_7BB8020ADF3635C7": {
            key: string;
            valueJson: string;
        };
        "Source.Anonymous_7C296E0371D93961": {
            byClient: components["schemas"]["Source.Anonymous_64E2A7F145D72719"][];
            criticalRisk: number;
            expired: number;
            expiringSoon: number;
            missing: number;
            rejected: number;
        };
        "Source.Anonymous_7D46AD0CD0C26B55": {
            /** Format: uuid */
            id: string;
            missingRequiredItems: number;
            name: string;
        };
        "Source.Anonymous_007E48C86513EA18": {
            delivery: string;
            deliveryError: string | null;
            email: string;
            fullName: string;
            /** Format: uuid */
            id: string;
            invite: components["schemas"]["Source.Anonymous_EF9688A74F537602"];
            role: string;
        };
        "Source.Anonymous_9A98D21AEB5A3D41": {
            isActive: boolean;
            name: string;
        };
        "Source.Anonymous_9A340C529CFCAB52": {
            /** Format: uuid */
            clientId: string;
            currentVersionNumber: number;
            /** Format: uuid */
            documentSlotId: string | null;
            documentType: string;
            fileType: string;
            /** Format: uuid */
            id: string;
            isSupportingDocument: boolean;
            /** Format: uuid */
            monthlyPackId: string;
            name: string;
            sizeBytes: number;
            status: string;
            storageKey: string | null;
            /** Format: date-time */
            updatedAtUtc: string;
            /** Format: date-time */
            uploadedAtUtc: string;
            /** Format: uuid */
            uploadedByUserId: string;
        };
        "Source.Anonymous_9AA64E27BC799172": {
            accountantName: string | null;
            /** Format: uuid */
            accountantUserId: string;
            assignedClients: number;
            expiredCompliance: number;
            openRequests: number;
            pendingReviewItems: number;
        };
        "Source.Anonymous_20DA44C347CE5D57": {
            /** Format: uuid */
            id: string;
        };
        "Source.Anonymous_47A98FB5FCE7B2FF": {
            /** Format: date-time */
            expiresAtUtc: string;
            /** Format: uuid */
            id: string;
        };
        "Source.Anonymous_64E2A7F145D72719": {
            /** Format: uuid */
            clientId: string;
            clientName: string | null;
            criticalRisk: number;
            expired: number;
            expiringSoon: number;
        };
        "Source.Anonymous_79F4760F842BA5F4": {
            complianceRisk: components["schemas"]["Source.Anonymous_54443F83B3CB4BF7"][];
            /** Format: date-time */
            generatedAtUtc: string;
            missingDocuments: components["schemas"]["Source.Anonymous_7D46AD0CD0C26B55"][];
            openRequests: components["schemas"]["Source.Anonymous_A9E77C295F343D44"][];
            overdueClients: components["schemas"]["Source.Anonymous_5BA45F232671B497"][];
            totals: components["schemas"]["Source.Anonymous_392719BDD185F1E2"];
        };
        "Source.Anonymous_80F498E84D42EC5C": {
            /** Format: uuid */
            currentAccountantUserId: string;
            /** Format: uuid */
            id: string;
            isPrimary: boolean;
            /** Format: uuid */
            previousAccountantUserId: string;
        };
        "Source.Anonymous_82D248D2EDF80DDB": {
            /** Format: uuid */
            id: string;
            revokedSessions: number;
            role: string;
        };
        "Source.Anonymous_99B3B9D0017ED7AC": {
            error: string;
        };
        "Source.Anonymous_99FB1EEAA61A925F": {
            compliance: components["schemas"]["Source.Anonymous_7C296E0371D93961"];
            /** Format: date-time */
            generatedAtUtc: string;
            monthlyPacks: components["schemas"]["Source.Anonymous_0159C4D2807FA3A2"];
            requests: components["schemas"]["Source.Anonymous_CB315BE9A4EEC870"];
            reviewQueue: components["schemas"]["Source.Anonymous_D07AB09A953ACD1D"];
            workload: components["schemas"]["Source.Anonymous_9AA64E27BC799172"][];
        };
        "Source.Anonymous_0159C4D2807FA3A2": {
            byStatus: components["schemas"]["Source.Anonymous_B9B4467E2A5EA1F9"][];
            missingRequiredSlots: number;
            overdueOpen: number;
            readyToClose: number;
            totalOpen: number;
        };
        "Source.Anonymous_213A8F280BB41FF7": {
            /** Format: uuid */
            id: string;
            isActive: boolean;
            securityStatus: string;
        };
        "Source.Anonymous_396FBB4D6D8C23E7": {
            delivery: string;
            deliveryError: string | null;
            /** Format: uuid */
            id: string;
            invite: components["schemas"]["Source.Anonymous_EF9688A74F537602"];
            reset: boolean;
        };
        "Source.Anonymous_663DA7957586995E": {
            revokedSessions: number;
        };
        "Source.Anonymous_783B1C4893B2FA97": {
            database: string;
            ok: boolean;
        };
        "Source.Anonymous_877D613AAD4AF1A9": {
            /** Format: date-time */
            decidedAtUtc: string;
            decision: string;
            /** Format: uuid */
            documentId: string;
            documentStatus: string;
            /** Format: uuid */
            id: string;
            internalNote: string | null;
            reason: string | null;
        };
        "Source.Anonymous_883FB65BF3676807": {
            /** Format: uuid */
            clientId: string;
            clientName: string;
            items: number;
            oldestAgeDays: number;
            urgent: number;
        };
        "Source.Anonymous_6936B768DF90D6B3": {
            complianceScore: number;
            /** Format: uuid */
            id: string;
            name: string;
            outstandingItems: components["schemas"]["Source.Anonymous_45331AD01936BE6B"];
            submissionRate: number;
        };
        "Source.Anonymous_45331AD01936BE6B": {
            expiredComplianceItems: number;
            missingComplianceItems: number;
            openRequests: number;
            rejectedComplianceItems: number;
        };
        "Source.Anonymous_54443F83B3CB4BF7": {
            complianceScore: number;
            expired: number;
            highRisk: number;
            /** Format: uuid */
            id: string;
            missing: number;
            name: string;
        };
        "Source.Anonymous_62539CD109EF9413": {
            clients: components["schemas"]["Source.Anonymous_0BE56803BB372A56"][];
            /** Format: date-time */
            generatedAtUtc: string;
            totals: components["schemas"]["Source.Anonymous_2CA2AB48C709BFD7"];
        };
        "Source.Anonymous_87077E95EAB44977": {
            /** Format: uuid */
            clientId: string;
            clientName: string | null;
            overdue: number;
            total: number;
            waitingOnClient: number;
        };
        "Source.Anonymous_392719BDD185F1E2": {
            totalClients: number;
            totalHighRiskComplianceItems: number;
            totalMissingDocuments: number;
            totalOpenRequests: number;
        };
        "Source.Anonymous_5611570D110419EB": {
            email: string;
            fullName: string;
            /** Format: uuid */
            id: string;
            role: string;
            roleScope: string;
        };
        "Source.Anonymous_90200779D599B7E1": {
            clients: components["schemas"]["Source.Anonymous_6936B768DF90D6B3"][];
            /** Format: date-time */
            generatedAtUtc: string;
        };
        "Source.Anonymous_A3A67283782096AA": {
            user: components["schemas"]["Source.Anonymous_5D788E0C4C4ECE98"];
        };
        "Source.Anonymous_A7B2624949832159": {
            /** Format: date-time */
            expiresAtUtc: string;
            /** Format: date-time */
            refreshExpiresAtUtc: string;
            session: components["schemas"]["Source.Anonymous_47A98FB5FCE7B2FF"];
            user: components["schemas"]["Source.Anonymous_5611570D110419EB"];
        };
        "Source.Anonymous_A8B2CA516AE40F95": {
            alertLevel: string | null;
            categoryCode: string | null;
            /** Format: uuid */
            categoryId: string;
            categoryName: string | null;
            /** Format: uuid */
            clientId: string;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: date-time */
            dueDateUtc: string | null;
            /** Format: date-time */
            expiryDateUtc: string | null;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            linkedDocumentId: string | null;
            name: string;
            ownerName: string | null;
            /** Format: uuid */
            ownerUserId: string | null;
            requiredDocumentCategory: string | null;
            riskLevel: string;
            status: string;
            /** Format: date-time */
            updatedAtUtc: string;
        };
        "Source.Anonymous_A9E77C295F343D44": {
            awaitingAccountant: number;
            awaitingClient: number;
            overdue: number;
            requestType: string;
            total: number;
        };
        "Source.Anonymous_B9B4467E2A5EA1F9": {
            status: string;
            total: number;
        };
        "Source.Anonymous_B9BF36DE1611F5FA": {
            delivery: string;
            deliveryError: string | null;
            /** Format: date-time */
            expiresAtUtc: string;
            /** Format: uuid */
            id: string;
        };
        "Source.Anonymous_B9D995E5CB0B554E": {
            accountants: components["schemas"]["Source.Anonymous_3EB22849C2884330"][];
            /** Format: date-time */
            generatedAtUtc: string;
        };
        "Source.Anonymous_B76B43B256327061": {
            openRequests: number;
            openTasks: number;
            pendingDocuments: number;
        };
        "Source.Anonymous_B087961A8D3064F8": {
            updated: number;
        };
        "Source.Anonymous_C73CE5F0B0F4F370": {
            alertLevel: string;
            categoryName: string | null;
            /** Format: uuid */
            clientId: string;
            /** Format: uuid */
            complianceItemId: string;
            /** Format: date-time */
            dueDateUtc: string | null;
            /** Format: date-time */
            expiryDateUtc: string | null;
            message: string;
            name: string;
            ownerName: string | null;
            /** Format: uuid */
            ownerUserId: string | null;
            riskLevel: string;
            status: string;
        };
        "Source.Anonymous_CB315BE9A4EEC870": {
            averageAgeDays: number;
            byClient: components["schemas"]["Source.Anonymous_87077E95EAB44977"][];
            overdue: number;
            totalOpen: number;
            waitingOnAccountant: number;
            waitingOnClient: number;
        };
        "Source.Anonymous_D3EA0BC0074867C4": {
            /** Format: date-time */
            verifiedAtUtc: string | null;
        };
        "Source.Anonymous_D07AB09A953ACD1D": {
            byClient: components["schemas"]["Source.Anonymous_883FB65BF3676807"][];
            high: number;
            oldestAgeDays: number;
            submitted: number;
            total: number;
            underReview: number;
            urgent: number;
        };
        "Source.Anonymous_D4117D750113A76B": {
            clientIds: string[];
            delivery: string;
            email: string;
            fullName: string;
            /** Format: uuid */
            id: string;
            invite: components["schemas"]["Source.Anonymous_EF9688A74F537602"];
            permissions: string[];
            role: string;
            roleScope: string;
        };
        "Source.Anonymous_D999510D6F7DF38D": {
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: uuid */
            documentId: string;
            fileType: string;
            /** Format: uuid */
            id: string;
            isCurrent: boolean;
            name: string;
            originalFileName: string;
            sizeBytes: number;
            storageKey: string | null;
            storedFileName: string;
            /** Format: uuid */
            uploadedByUserId: string;
            versionNumber: number;
        };
        "Source.Anonymous_E2705C7C191DDE6C": {
            /** Format: uuid */
            id: string;
            status: string;
        };
        "Source.Anonymous_E9271998E14AAB2F": {
            seeded: boolean;
        };
        "Source.Anonymous_EE85ECF79EC892D7": {
            archiveMonth: number | null;
            archiveScope: string;
            archiveYear: number | null;
            /** Format: uuid */
            clientId: string;
            currentVersionNumber: number;
            /** Format: uuid */
            documentSlotId: string | null;
            documentType: string;
            fileType: string;
            /** Format: uuid */
            id: string;
            isHistoricallyFiled: boolean;
            /** Format: uuid */
            monthlyPackId: string | null;
            name: string;
            sizeBytes: number;
            status: string;
            storageKey: string | null;
            /** Format: date-time */
            updatedAtUtc: string;
            /** Format: date-time */
            uploadedAtUtc: string;
            /** Format: uuid */
            uploadedByUserId: string;
        };
        "Source.Anonymous_EF96CBDA05C87888": {
            /** Format: uuid */
            categoryId: string;
            categoryName: string | null;
            expired: number;
            highRisk: number;
            total: number;
            valid: number;
        };
        "Source.Anonymous_EF721FCEB23C5E48": {
            authenticated: boolean;
            recoveryCodes: string[] | null;
        };
        "Source.Anonymous_EF9688A74F537602": {
            /** Format: date-time */
            expiresAtUtc: string;
        };
        "Source.Anonymous_F0BB22A31033A626": {
            clientIds: string[];
            /** Format: date-time */
            createdAtUtc: string;
            email: string;
            fullName: string;
            /** Format: uuid */
            id: string;
            permissions: string[];
            profileJson: string | null;
            role: string;
            roleActive: boolean;
            roleScope: string;
            securityJson: string | null;
            /** Format: date-time */
            updatedAtUtc: string;
        };
        "Source.Anonymous_F4BC5AC777FE3F31": {
            ok: boolean;
            service: string;
        };
        "Source.Anonymous_F11D278F23422B06": {
            /** Format: uuid */
            id: string;
            role: string;
        };
        "Source.Anonymous_F080ABFCC0F8D418": {
            displayName: string;
            isActive: boolean;
            name: string;
            permissions: string[];
            scope: string;
        };
        "Source.SecureClientPortal.Backend.Api.Modules.Auth.CsrfTokenResponse": {
            requestToken: string;
        };
        "Source.SecureClientPortal.Backend.Api.Modules.FirmManagement.FirmBrandingResponse": {
            firmName: string;
            logoDataUrl: string | null;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Assignments.AssignmentResponse": {
            accountantName: string | null;
            /** Format: uuid */
            accountantUserId: string;
            /** Format: uuid */
            clientId: string;
            clientName: string | null;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: uuid */
            id: string;
            isPrimary: boolean;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Auth.SecuritySessionResponse": {
            clientIp: string | null;
            device: string | null;
            /** Format: date-time */
            expiresAtUtc: string;
            /** Format: uuid */
            id: string;
            isCurrent: boolean;
            /** Format: date-time */
            issuedAtUtc: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Auth.SecuritySettingsResponse": {
            mfaEnabled: boolean;
            mfaSupported: boolean;
            /** Format: date-time */
            passwordLastChangedAtUtc: string | null;
            recoveryEmail: string | null;
            sessions: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Auth.SecuritySessionResponse"][];
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Auth.SessionRevocationResponse": {
            revokedCount: number;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Clients.ClientBusinessProfileResponse": {
            addressLine: string;
            city: string;
            /** Format: uuid */
            clientId: string;
            country: string;
            financeEmail: string;
            industry: string;
            legalName: string;
            phone: string;
            primaryContact: string;
            primaryContactJobTitle: string;
            registrationNumber: string;
            taxNumber: string;
            tradingName: string;
            /** Format: date-time */
            updatedAtUtc: string;
            vatNumber: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Clients.ClientOnboardingOptions": {
            accountants: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Clients.OnboardingPerson"][];
            clientUsers: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Clients.OnboardingPerson"][];
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Clients.ClientOnboardingResponse": {
            /** Format: uuid */
            accountantUserId: string;
            /** Format: uuid */
            clientId: string;
            clientName: string;
            invitationDelivery: string;
            message: string;
            userCreated: boolean;
            /** Format: uuid */
            userId: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Clients.OnboardingPerson": {
            email: string;
            fullName: string;
            /** Format: uuid */
            id: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ClientComplianceProfile": {
            cipcRegistered: boolean | null;
            /** Format: uuid */
            clientId: string;
            coidaRegistered: boolean | null;
            companyTaxRegistered: boolean | null;
            csdRegistered: boolean | null;
            csdSupplierNumber: string | null;
            financialYearEndMonth: number;
            governmentSupplier: boolean | null;
            payeRegistered: boolean | null;
            provisionalTaxpayer: boolean | null;
            uifRegistered: boolean | null;
            /** Format: date-time */
            updatedAtUtc: string | null;
            vatAnchorMonth: number;
            vatCycleMonths: number;
            vatRegistered: boolean | null;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceAutomationRunResult": {
            clientsEvaluated: number;
            missingEvidenceRequestsCreated: number;
            notificationsCreated: number;
            obligationsCreated: number;
            obligationsRefreshed: number;
            /** Format: date-time */
            runAtUtc: string;
            warnings: string[];
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceEvidenceVersionResponse": {
            /** Format: uuid */
            clientId: string;
            /** Format: uuid */
            complianceItemId: string;
            contentType: string;
            downloadUrl: string;
            fileName: string;
            /** Format: uuid */
            id: string;
            isCurrentVersion: boolean;
            note: string | null;
            sizeBytes: number;
            /** Format: date-time */
            uploadedAtUtc: string;
            uploadedBy: string | null;
            /** Format: uuid */
            uploadedByUserId: string;
            versionNumber: number;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceHistoryEntryResponse": {
            action: string;
            actor: string;
            actorRole: string;
            detail: string;
            /** Format: uuid */
            entityId: string;
            entityType: string;
            /** Format: uuid */
            id: string;
            metadataJson: string | null;
            /** Format: date-time */
            timestamp: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceMonitoringResponse": {
            canManage: boolean;
            checks: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.MonitoringCheckResponse"][];
            /** Format: uuid */
            clientId: string;
            clientName: string;
            csdSupplierNumber: string;
            registrationNumber: string;
            taxNumber: string;
            /** Format: uuid */
            version: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceObligationResponse": {
            amountPaid: number | null;
            amountPayable: number | null;
            amountRefundable: number | null;
            authority: string;
            /** Format: uuid */
            clientId: string;
            clientName: string;
            code: string;
            /** Format: date-time */
            createdAtUtc: string;
            createdReason: string;
            /** Format: date-time */
            dueDateUtc: string | null;
            evidenceFound: number;
            evidenceRequired: number;
            /** Format: uuid */
            id: string;
            missingEvidenceCategories: string[];
            name: string;
            notApplicableReason: string | null;
            /** Format: date-time */
            paidAtUtc: string | null;
            paymentReference: string | null;
            paymentRequired: boolean;
            paymentStatus: string;
            /** Format: date-time */
            periodEndUtc: string;
            /** Format: date-time */
            periodStartUtc: string;
            preparationStatus: string;
            readiness: string;
            /** Format: uuid */
            responsibleAccountantId: string | null;
            reviewStatus: string;
            ruleVersion: string;
            submissionReference: string | null;
            submissionStatus: string;
            /** Format: date-time */
            submittedAtUtc: string | null;
            /** Format: date-time */
            updatedAtUtc: string;
            workflowStatus: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceRuleDefinition": {
            applicabilityField: string;
            authority: string;
            cadenceMonths: number;
            categoryCode: string;
            code: string;
            dueDayOfMonth: number | null;
            dueOffsetMonths: number;
            /** Format: date-time */
            effectiveFromUtc: string;
            /** Format: date-time */
            effectiveToUtc: string | null;
            name: string;
            requiredDocumentCategories: string[];
            requiresPayment: boolean;
            requiresSubmission: boolean;
            version: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceRuleSet": {
            rules: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceRuleDefinition"][];
            /** Format: date-time */
            updatedAtUtc: string;
            version: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.MonitoringCheckResponse": {
            applicability: string;
            code: string;
            connectionStatus: string;
            description: string;
            latestVerification: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.VerificationResponse"] | null;
            name: string;
            reason: string;
            source: string;
            verificationStatus: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ObligationEvidenceResponse": {
            evidence: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceEvidenceVersionResponse"];
            obligation: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceObligationResponse"];
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.VerificationResponse": {
            checkCode: string;
            /** Format: date-time */
            checkedAtUtc: string;
            evidenceReference: string;
            /** Format: uuid */
            id: string;
            matchesCurrentIdentifiers: boolean;
            method: string;
            outcome: string;
            /** Format: date-time */
            recordedAtUtc: string;
            recordedByName: string;
            /** Format: uuid */
            recordedByUserId: string;
            /** Format: date-time */
            reviewAfterUtc: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Documents.ArchivePlacementResponse": {
            month: number | null;
            scope: string;
            year: number | null;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewEvidence": {
            confidence: number | null;
            field: string;
            height: number;
            pageIndex: number;
            text: string;
            width: number;
            x: number;
            y: number;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewFinding": {
            fields: string[];
            id: string;
            message: string;
            /** Format: uuid */
            relatedDocumentId: string | null;
            relatedDocumentName: string | null;
            result: string;
            rule: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewHistory": {
            /** Format: uuid */
            actorUserId: string;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: uuid */
            id: string;
            lineItems: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewLineItem"][] | null;
            lineItemsConfirmed: boolean;
            reviewNote: string | null;
            revision: number;
            source: string;
            values: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewValues"];
            versionNumber: number;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewLineItem": {
            description: string;
            discount: string;
            netTotal: string;
            quantity: string;
            unitPrice: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewResponse": {
            canAccept: boolean;
            /** Format: uuid */
            documentId: string;
            evidence: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewEvidence"][];
            findings: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewFinding"][];
            history: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewHistory"][];
            isStale: boolean;
            legacyAmount: string | null;
            lineItems: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewLineItem"][] | null;
            lineItemsConfirmed: boolean;
            month: number;
            originalConfirmed: boolean;
            reviewNote: string | null;
            revision: number;
            ruleSetVersion: string;
            state: string;
            suggestions: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewValues"] | null;
            values: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewValues"];
            versionNumber: number;
            year: number;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewValues": {
            adjustments: string;
            allAdjustmentsAccountedFor: boolean;
            amountDue: string;
            currency: string;
            invoiceDate: string;
            invoiceNumber: string;
            invoiceTotal: string;
            subtotal: string;
            supplierName: string;
            vatAmount: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.DeadlineRuleDto": {
            dueDayOfMonth: number;
            graceDays: number;
            /** Format: uuid */
            id: string;
            isEnabled: boolean;
            name: string;
            priority: string;
            scope: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.EscalationRuleDto": {
            action: string;
            daysAfterDue: number;
            escalateToRole: string;
            /** Format: uuid */
            id: string;
            isEnabled: boolean;
            name: string;
            triggerType: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.MonthlyPackTemplateDto": {
            autoCreateDayOfMonth: number;
            description: string;
            /** Format: uuid */
            id: string;
            name: string;
            requiredDocumentTemplateIds: string[];
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.ReminderRuleDto": {
            audienceRole: string;
            daysBeforeDue: number;
            /** Format: uuid */
            id: string;
            isEnabled: boolean;
            messageTemplate: string;
            name: string;
            triggerType: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.RequestTemplateDto": {
            defaultDueInDays: number | null;
            descriptionTemplate: string;
            /** Format: uuid */
            id: string;
            name: string;
            priority: string;
            requestType: string;
            titleTemplate: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.RequiredDocumentTemplateDto": {
            defaultDueDayOfMonth: number | null;
            description: string;
            documentCategory: string;
            /** Format: uuid */
            id: string;
            isRequired: boolean;
            name: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail": {
            archiveWarnings: string[] | null;
            clients: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationClientRow"][];
            documents: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationDocumentRow"][];
            summary: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationSummary"];
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationClientInput": {
            accountantEmail: string;
            contactEmail: string;
            contactName: string;
            entityType: string;
            industry: string;
            name: string;
            registrationNumber: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationClientRow": {
            errors: string[];
            /** Format: uuid */
            existingClientId: string | null;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            importedId: string | null;
            skip: boolean;
            sourceRow: number;
            useExistingClient: boolean;
            values: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationClientInput"];
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationDocumentInput": {
            category: string;
            /** Format: uuid */
            clientId: string | null;
            displayName: string;
            duplicateAcknowledged: boolean;
            historicalNotes: string | null;
            historicalStatusConfirmed: boolean;
            month: number | null;
            ownershipConfirmed: boolean;
            previouslyFiled: boolean;
            /** Format: date-time */
            previousReviewDateUtc: string | null;
            previousReviewer: string | null;
            recordScope: string;
            skip: boolean;
            sourcePath: string | null;
            year: number | null;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationDocumentRow": {
            errors: string[];
            fileName: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            importedId: string | null;
            sizeBytes: number;
            values: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationDocumentInput"];
            warnings: string[];
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationSummary": {
            clientRows: number;
            /** Format: date-time */
            createdAtUtc: string;
            documents: number;
            /** Format: uuid */
            id: string;
            importedClients: number;
            importedDocuments: number;
            linkedClients: number;
            name: string;
            status: string;
            /** Format: date-time */
            updatedAtUtc: string;
            version: number;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.AddClientMonthlyPackItemResponse": {
            /** Format: uuid */
            monthlyPackId: string;
            recurrence: string;
            /** Format: uuid */
            recurringRequestId: string | null;
            /** Format: uuid */
            slotId: string;
            source: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.ClientMonthlyPackCurrentItemDto": {
            category: string;
            /** Format: date-time */
            dueDateUtc: string | null;
            isRequired: boolean;
            label: string;
            reason: string | null;
            /** Format: uuid */
            slotId: string;
            source: string;
            status: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.ClientMonthlyPackProfileDto": {
            availableTemplates: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.ClientMonthlyPackTemplateOptionDto"][];
            /** Format: uuid */
            clientId: string;
            currentPackItems: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.ClientMonthlyPackCurrentItemDto"][];
            operatingProfile: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.ClientOperatingProfileDto"] | null;
            pendingRecurringItems: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.PendingRecurringPackItemDto"][];
            recommendations: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.MonthlyPackRequirementRecommendationDto"][] | null;
            /** Format: uuid */
            recommendedTemplateId: string | null;
            recommendedTemplateReason: string | null;
            recurringItems: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.ClientMonthlyPackProfileItemDto"][];
            /** Format: uuid */
            templateId: string | null;
            templateName: string | null;
            /** Format: date-time */
            updatedAtUtc: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.ClientMonthlyPackProfileItemDto": {
            cadence: string;
            category: string;
            defaultDueDayOfMonth: number | null;
            /** Format: date-time */
            effectiveFromUtc: string | null;
            /** Format: date-time */
            effectiveToUtc: string | null;
            /** Format: uuid */
            id: string;
            isRequired: boolean;
            label: string;
            reason: string | null;
            source: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.ClientMonthlyPackTemplateOptionDto": {
            description: string;
            /** Format: uuid */
            id: string;
            name: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.ClientOperatingProfileDto": {
            bankFeedConnected: boolean;
            /** Format: date-time */
            effectiveFromUtc: string;
            hasEmployees: boolean | null;
            holdsInventory: boolean | null;
            isComplete: boolean;
            manufacturesGoods: boolean | null;
            operatesFleet: boolean | null;
            purchaseInvoicesSynced: boolean;
            salesInvoicesSynced: boolean;
            tracksProjectCosts: boolean | null;
            usesBookingPlatforms: boolean | null;
            usesFoodSuppliers: boolean | null;
            usesPaymentCertificates: boolean | null;
            usesPos: boolean | null;
            usesSubcontractors: boolean | null;
            usesSupplierAccounts: boolean | null;
            vatAnchorMonth: number;
            vatCycleMonths: number;
            vatRegistered: boolean | null;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.DocumentSlotResponse": {
            canSubmit: boolean;
            category: string;
            /** Format: uuid */
            clientId: string;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: uuid */
            currentDocumentId: string | null;
            /** Format: date-time */
            dueDateUtc: string | null;
            /** Format: uuid */
            id: string;
            isRequired: boolean;
            label: string;
            /** Format: uuid */
            monthlyPackId: string;
            rejectionReason: string | null;
            reviewStatus: string;
            status: string;
            /** Format: date-time */
            submittedAtUtc: string | null;
            /** Format: uuid */
            submittedByUserId: string | null;
            /** Format: date-time */
            updatedAtUtc: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.DocumentSlotWorkspaceResponse": {
            slot: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.DocumentSlotResponse"];
            workspace: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.ReviewQueue.ReviewQueueWorkspaceResponse"];
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.MonthlyPackReconciliationResultDto": {
            added: number;
            /** Format: uuid */
            monthlyPackId: string;
            preservedWithEvidence: number;
            removed: number;
            updated: number;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.MonthlyPackRequirementRecommendationDto": {
            cadence: string;
            category: string;
            decision: string;
            isRequired: boolean;
            label: string;
            reason: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.MonthlyPackResponse": {
            /** Format: uuid */
            clientId: string;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: uuid */
            id: string;
            month: number;
            status: string;
            /** Format: date-time */
            updatedAtUtc: string;
            year: number;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.PendingRecurringPackItemDto": {
            category: string;
            defaultDueDayOfMonth: number | null;
            /** Format: uuid */
            id: string;
            isRequired: boolean;
            label: string;
            /** Format: date-time */
            requestedAtUtc: string;
            /** Format: uuid */
            requestedByUserId: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Notifications.NotificationPreferenceResponse": {
            browserAlerts: boolean;
            complianceAlerts: boolean;
            deadlineAlerts: boolean;
            emailReminders: boolean;
            escalationAlerts: boolean;
            quietHours: string;
            rejectionAlerts: boolean;
            /** Format: date-time */
            updatedAtUtc: string | null;
            weeklySummary: boolean;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Reports.ReportScheduleResponse": {
            /** Format: uuid */
            clientId: string | null;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: uuid */
            createdByUserId: string;
            frequency: string;
            /** Format: uuid */
            id: string;
            /** Format: date-time */
            lastScheduledAtUtc: string;
            /** Format: date-time */
            nextRunAtUtc: string;
            recipients: string[];
            reportType: string;
            /** Format: date-time */
            updatedAtUtc: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Requests.RequestDocumentUploadResponse": {
            message: string;
            workspace: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Requests.RequestWorkspaceResponse"];
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Requests.RequestReadStateResponse": {
            /** Format: date-time */
            lastReadAtUtc: string;
            /** Format: uuid */
            requestId: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Requests.RequestWorkspaceCommentResponse": {
            authorRole: string;
            /** Format: uuid */
            authorUserId: string;
            /** Format: uuid */
            clientId: string;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: uuid */
            id: string;
            isInternal: boolean;
            message: string;
            /** Format: uuid */
            requestId: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Requests.RequestWorkspaceDocumentVersionResponse": {
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: uuid */
            documentId: string;
            fileType: string;
            /** Format: uuid */
            id: string;
            isCurrentVersion: boolean;
            name: string;
            originalFileName: string;
            sizeBytes: number;
            storedFileName: string;
            versionNumber: number;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Requests.RequestWorkspaceItemResponse": {
            /** Format: uuid */
            clientId: string;
            description: string;
            /** Format: date-time */
            dueDateUtc: string | null;
            /** Format: uuid */
            id: string;
            priority: string;
            /** Format: uuid */
            relatedDocumentId: string | null;
            /** Format: date-time */
            requestedAtUtc: string;
            /** Format: uuid */
            requestedByUserId: string;
            requestType: string;
            /** Format: date-time */
            resolvedAtUtc: string | null;
            /** Format: uuid */
            resolvedByUserId: string | null;
            status: string;
            title: string;
            /** Format: date-time */
            updatedAtUtc: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Requests.RequestWorkspaceRelatedDocumentResponse": {
            category: string;
            /** Format: uuid */
            clientId: string;
            currentVersionNumber: number;
            /** Format: uuid */
            documentSlotId: string | null;
            downloadUrl: string;
            fileType: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            monthlyPackId: string | null;
            name: string;
            sizeBytes: number;
            status: string;
            /** Format: date-time */
            updatedAtUtc: string | null;
            /** Format: date-time */
            uploadedAtUtc: string;
            versions: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Requests.RequestWorkspaceDocumentVersionResponse"][];
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.Requests.RequestWorkspaceResponse": {
            canUploadCorrection: boolean;
            comments: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Requests.RequestWorkspaceCommentResponse"][];
            relatedDocument: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Requests.RequestWorkspaceRelatedDocumentResponse"] | null;
            request: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Requests.RequestWorkspaceItemResponse"];
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.ReviewQueue.ReviewQueueCommentResponse": {
            authorRole: string;
            /** Format: uuid */
            authorUserId: string;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: uuid */
            documentId: string;
            /** Format: uuid */
            id: string;
            message: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.ReviewQueue.ReviewQueueDecisionResponse": {
            /** Format: date-time */
            decidedAtUtc: string;
            decision: string;
            /** Format: uuid */
            documentId: string;
            /** Format: uuid */
            id: string;
            internalNote: string | null;
            reason: string | null;
            reviewerRole: string;
            /** Format: uuid */
            reviewerUserId: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.ReviewQueue.ReviewQueueItemResponse": {
            assistantAttentionCount: number;
            assistantState: string | null;
            assistantUnverifiedCount: number;
            /** Format: uuid */
            clientId: string;
            clientName: string;
            currentVersionNumber: number;
            documentCategory: string;
            /** Format: uuid */
            documentId: string;
            documentName: string;
            /** Format: uuid */
            documentSlotId: string | null;
            documentStatus: string;
            month: number | null;
            /** Format: uuid */
            monthlyPackId: string | null;
            rejectionReason: string | null;
            reviewAgeDays: number;
            reviewPriority: string;
            slotLabel: string | null;
            slotStatus: string | null;
            /** Format: date-time */
            submittedAtUtc: string | null;
            /** Format: date-time */
            uploadedAtUtc: string;
            year: number | null;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.ReviewQueue.ReviewQueueVersionResponse": {
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: uuid */
            documentId: string;
            fileType: string;
            /** Format: uuid */
            id: string;
            isCurrent: boolean;
            name: string;
            originalFileName: string;
            sizeBytes: number;
            storedFileName: string;
            /** Format: uuid */
            uploadedByUserId: string;
            versionNumber: number;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.ReviewQueue.ReviewQueueWorkspaceResponse": {
            comments: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.ReviewQueue.ReviewQueueCommentResponse"][];
            downloadUrl: string;
            item: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.ReviewQueue.ReviewQueueItemResponse"];
            reviewHistory: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.ReviewQueue.ReviewQueueDecisionResponse"][];
            versions: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.ReviewQueue.ReviewQueueVersionResponse"][];
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AccountantProgress": {
            /** Format: uuid */
            accountantId: string;
            accountStatus: string;
            approvedItems: number;
            awaitingReview: number;
            backupClients: number;
            clients: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.ClientWorkProgress"][];
            decisionsToday: number;
            inReview: number;
            latestActivity: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.TeamActivity"] | null;
            name: string;
            primaryClients: number;
            requiredItems: number;
            waitingOnClient: number;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminOperationsResponse": {
            accessEmailEnabled: boolean;
            automationEnabled: boolean;
            automationLastRun: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.OperationResult"] | null;
            /** Format: date-time */
            checkedAtUtc: string;
            deploymentMode: string;
            emailFailed: number;
            emailPending: number;
            lastBackup: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.OperationResult"] | null;
            lastRestore: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.OperationResult"] | null;
            missingDocuments: number;
            notificationEmailEnabled: boolean;
            overdueDocuments: number;
            overdueRequests: number;
            packsClosed: number;
            packsUnderReview: number;
            storageAvailable: boolean;
            storageBytes: number | null;
            storageQuotaBytes: number;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.ClientWorkProgress": {
            assignment: string;
            /** Format: uuid */
            clientId: string;
            clientName: string;
            packs: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.PackProgress"][];
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.OperationResult": {
            /** Format: date-time */
            atUtc: string;
            status: string;
            verified: boolean;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.PackProgress": {
            approvedItems: number;
            awaitingReview: number;
            inReview: number;
            month: number;
            /** Format: uuid */
            packId: string;
            requiredItems: number;
            status: string;
            waitingOnClient: number;
            year: number;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.RoleManagementAccess": {
            canActivate: boolean;
            canCreate: boolean;
            canDeactivate: boolean;
            canUpdate: boolean;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.RoleResponse": {
            configuredPermissions: string[];
            /** Format: date-time */
            createdAtUtc: string;
            displayName: string;
            isActive: boolean;
            isSystemRole: boolean;
            name: string;
            permissions: string[];
            scope: string;
            /** Format: date-time */
            updatedAtUtc: string;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.TeamActivity": {
            action: string;
            /** Format: date-time */
            atUtc: string;
            clientName: string | null;
            documentName: string | null;
        };
        "Source.SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.TeamProgressResponse": {
            accountants: components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AccountantProgress"][];
            /** Format: date-time */
            checkedAtUtc: string;
            unassignedClients: number;
        };
        "Source.SecureClientPortal.Backend.Application.Modules.Banking.BankAccountDto": {
            accountName: string;
            accountNumberMasked: string;
            accountType: string;
            availableBalance: number | null;
            /** Format: uuid */
            bankConnectionId: string;
            bankName: string;
            currency: string;
            currentBalance: number | null;
            /** Format: uuid */
            id: string;
            /** Format: date-time */
            lastUpdatedAtUtc: string;
        };
        "Source.SecureClientPortal.Backend.Application.Modules.Banking.BankConnectionDto": {
            /** Format: uuid */
            clientId: string;
            /** Format: date-time */
            connectedAtUtc: string;
            /** Format: date-time */
            consentExpiresAtUtc: string | null;
            /** Format: date-time */
            disconnectedAtUtc: string | null;
            failureReason: string | null;
            /** Format: uuid */
            id: string;
            /** Format: date-time */
            lastSyncedAtUtc: string | null;
            provider: string;
            status: string;
        };
        "Source.SecureClientPortal.Backend.Application.Modules.Banking.BankingOverviewDto": {
            accounts: components["schemas"]["Source.SecureClientPortal.Backend.Application.Modules.Banking.BankAccountDto"][];
            /** Format: uuid */
            clientId: string;
            connections: components["schemas"]["Source.SecureClientPortal.Backend.Application.Modules.Banking.BankConnectionDto"][];
            integrationEnabled: boolean;
            recentTransactions: components["schemas"]["Source.SecureClientPortal.Backend.Application.Modules.Banking.BankTransactionDto"][];
            sandboxEnabled: boolean;
            syncRuns: components["schemas"]["Source.SecureClientPortal.Backend.Application.Modules.Banking.BankSyncRunDto"][];
        };
        "Source.SecureClientPortal.Backend.Application.Modules.Banking.BankSyncRunDto": {
            /** Format: uuid */
            bankConnectionId: string;
            errorMessage: string | null;
            /** Format: date-time */
            finishedAtUtc: string | null;
            /** Format: date-time */
            fromDateUtc: string | null;
            /** Format: uuid */
            id: string;
            provider: string;
            /** Format: date-time */
            startedAtUtc: string;
            status: string;
            /** Format: date-time */
            toDateUtc: string | null;
            transactionsReceived: number;
        };
        "Source.SecureClientPortal.Backend.Application.Modules.Banking.BankTransactionDto": {
            amount: number;
            balance: number | null;
            /** Format: uuid */
            bankAccountId: string;
            description: string;
            direction: string;
            /** Format: uuid */
            id: string;
            /** Format: date-time */
            postedDateUtc: string | null;
            providerCategory: string;
            reference: string;
            /** Format: date-time */
            transactionDateUtc: string;
        };
        "Source.SecureClientPortal.Backend.Application.Modules.Banking.ManualTransactionImportResult": {
            credits: number;
            debits: number;
            duplicates: number;
            imported: number;
            preview: boolean;
            totalRows: number;
        };
        "Source.SecureClientPortal.Backend.Application.Modules.Banking.MonthlyPackBankingStatusDto": {
            /** Format: uuid */
            clientId: string;
            connectedAccountCount: number;
            /** Format: date-time */
            dataFromUtc: string | null;
            /** Format: date-time */
            dataThroughUtc: string | null;
            hasActiveConnection: boolean;
            isPeriodComplete: boolean;
            message: string;
            /** Format: date-time */
            missingFromUtc: string | null;
            /** Format: date-time */
            missingToUtc: string | null;
            month: number;
            /** Format: date-time */
            periodEndUtc: string;
            /** Format: date-time */
            periodStartUtc: string;
            /** Format: date-time */
            requiredThroughUtc: string;
            status: string;
            year: number;
        };
        "Source.SecureClientPortal.Backend.Application.Modules.Platform.AutomationRunSummary": {
            complianceItemsUpdated: number;
            complianceReminderNotificationsSent: number;
            documentRequirementNotificationsSent: number;
            documentSlotsCreated: number;
            draftSlotsAutoSubmitted: number;
            monthlyPackDeadlineNotificationsSent: number;
            monthlyPackNotificationsSent: number;
            monthlyPacksCreated: number;
            overdueRequestsMarked: number;
            requestEscalationNotificationsSent: number;
            /** Format: date-time */
            runAtUtc: string;
        };
        "Source.SecureClientPortal.Backend.Domain.Modules.Documents.Document": {
            archiveMonth: number | null;
            archiveScope: string;
            archiveYear: number | null;
            category: string;
            /** Format: uuid */
            clientId: string;
            contentSha256: string | null;
            currentVersionNumber: number;
            /** Format: uuid */
            documentSlotId: string | null;
            /** Format: date-time */
            filedAtUtc: string | null;
            /** Format: uuid */
            filedByUserId: string | null;
            fileType: string;
            /** Format: uuid */
            id: string;
            invoiceDetailsJson: string | null;
            invoiceReviewRequired: boolean;
            invoiceReviewRevision: number;
            isFiled: boolean;
            isHistoricallyFiled: boolean;
            /** Format: uuid */
            monthlyPackId: string | null;
            name: string;
            sizeBytes: number;
            status: string;
            storageKey: string | null;
            /** Format: date-time */
            updatedAtUtc: string;
            /** Format: date-time */
            uploadedAtUtc: string;
            /** Format: uuid */
            uploadedByUserId: string;
        };
        "Source.SecureClientPortal.Backend.Domain.Modules.Documents.DocumentComment": {
            authorRole: string;
            /** Format: uuid */
            authorUserId: string;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: uuid */
            documentId: string;
            /** Format: uuid */
            id: string;
            message: string;
        };
        "Source.SecureClientPortal.Backend.Domain.Modules.Documents.FilingRule": {
            category: string;
            /** Format: date-time */
            createdAtUtc: string;
            description: string;
            /** Format: uuid */
            id: string;
            isEnabled: boolean;
            /** Format: date-time */
            updatedAtUtc: string;
        };
        "Source.SecureClientPortal.Backend.Domain.Modules.MonthlyPacks.DocumentSlot": {
            canCurrentlyBeSubmitted: boolean;
            category: string;
            /** Format: uuid */
            clientId: string;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: uuid */
            currentDocumentId: string | null;
            /** Format: date-time */
            dueDateUtc: string | null;
            /** Format: uuid */
            id: string;
            isRequired: boolean;
            label: string;
            /** Format: uuid */
            monthlyPackId: string;
            rejectionReason: string | null;
            reviewStatus: string;
            status: string;
            /** Format: date-time */
            submittedAtUtc: string | null;
            /** Format: uuid */
            submittedByUserId: string | null;
            /** Format: date-time */
            updatedAtUtc: string;
        };
        "Source.SecureClientPortal.Backend.Models.AuditLog": {
            action: string;
            actorRole: string;
            /** Format: uuid */
            actorUserId: string | null;
            /** Format: uuid */
            clientId: string | null;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: uuid */
            entityId: string;
            entityType: string;
            /** Format: uuid */
            id: string;
            metadataJson: string | null;
        };
        "Source.SecureClientPortal.Backend.Models.Client": {
            addressLine: string;
            /** Format: uuid */
            assignedAccountantId: string;
            city: string;
            complianceHealth: number;
            country: string;
            /** Format: date-time */
            createdAtUtc: string;
            email: string;
            entityType: string;
            /** Format: uuid */
            id: string;
            industry: string;
            name: string;
            phone: string;
            primaryContact: string;
            primaryContactJobTitle: string;
            registrationNumber: string;
            status: string;
            taxNumber: string;
            tradingName: string;
            /** Format: date-time */
            updatedAtUtc: string;
            vatNumber: string;
        };
        "Source.SecureClientPortal.Backend.Models.ComplianceCategory": {
            code: string | null;
            /** Format: date-time */
            createdAtUtc: string;
            description: string;
            /** Format: uuid */
            id: string;
            isActive: boolean;
            name: string;
            /** Format: date-time */
            updatedAtUtc: string;
        };
        "Source.SecureClientPortal.Backend.Models.ComplianceReminder": {
            /** Format: uuid */
            clientId: string;
            /** Format: uuid */
            complianceItemId: string;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            recipientUserId: string;
            /** Format: date-time */
            scheduledForUtc: string;
            /** Format: date-time */
            sentAtUtc: string | null;
            status: string;
            type: string;
        };
        "Source.SecureClientPortal.Backend.Models.Notification": {
            /** Format: uuid */
            clientId: string | null;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: uuid */
            id: string;
            isRead: boolean;
            linkUrl: string | null;
            message: string;
            /** Format: date-time */
            readAtUtc: string | null;
            title: string;
            type: string;
            /** Format: uuid */
            userId: string;
        };
        "Source.SecureClientPortal.Backend.Models.RequestComment": {
            authorRole: string;
            /** Format: uuid */
            authorUserId: string;
            /** Format: uuid */
            clientId: string;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: uuid */
            id: string;
            isInternal: boolean;
            message: string;
            /** Format: uuid */
            requestId: string;
        };
        "Source.SecureClientPortal.Backend.Models.RequestItem": {
            /** Format: uuid */
            clientId: string;
            description: string;
            /** Format: date-time */
            dueDateUtc: string | null;
            /** Format: uuid */
            id: string;
            priority: string;
            /** Format: uuid */
            relatedDocumentId: string | null;
            /** Format: date-time */
            requestedAtUtc: string;
            /** Format: uuid */
            requestedByUserId: string;
            requestType: string;
            /** Format: date-time */
            resolvedAtUtc: string | null;
            /** Format: uuid */
            resolvedByUserId: string | null;
            status: string;
            title: string;
            /** Format: date-time */
            updatedAtUtc: string;
        };
        "Source.SecureClientPortal.Backend.Models.TaskItem": {
            /** Format: uuid */
            clientId: string;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: uuid */
            createdByUserId: string;
            /** Format: date-time */
            dueDateUtc: string | null;
            /** Format: uuid */
            id: string;
            priority: string;
            status: string;
            title: string;
            /** Format: date-time */
            updatedAtUtc: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    FirmManagement_GetDeadlineRules_GET_api_admin_firm_management_rules_deadlines: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.DeadlineRuleDto"][];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.DeadlineRuleDto"][];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.DeadlineRuleDto"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    FirmManagement_PutDeadlineRules_PUT_api_admin_firm_management_rules_deadlines: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.DeadlineRuleDto"][];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.DeadlineRuleDto"][];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.DeadlineRuleDto"][];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.DeadlineRuleDto"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    FirmManagement_GetEscalationRules_GET_api_admin_firm_management_rules_escalations: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.EscalationRuleDto"][];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.EscalationRuleDto"][];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.EscalationRuleDto"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    FirmManagement_PutEscalationRules_PUT_api_admin_firm_management_rules_escalations: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.EscalationRuleDto"][];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.EscalationRuleDto"][];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.EscalationRuleDto"][];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.EscalationRuleDto"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    FirmManagement_GetReminderRules_GET_api_admin_firm_management_rules_reminders: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.ReminderRuleDto"][];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.ReminderRuleDto"][];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.ReminderRuleDto"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    FirmManagement_PutReminderRules_PUT_api_admin_firm_management_rules_reminders: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.ReminderRuleDto"][];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.ReminderRuleDto"][];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.ReminderRuleDto"][];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.ReminderRuleDto"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    FirmManagement_SeedDefaults_POST_api_admin_firm_management_seed_defaults: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_E9271998E14AAB2F"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    FirmManagement_GetMonthlyPackTemplates_GET_api_admin_firm_management_templates_monthly_pack: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.MonthlyPackTemplateDto"][];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.MonthlyPackTemplateDto"][];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.MonthlyPackTemplateDto"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    FirmManagement_PutMonthlyPackTemplates_PUT_api_admin_firm_management_templates_monthly_pack: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.MonthlyPackTemplateDto"][];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.MonthlyPackTemplateDto"][];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.MonthlyPackTemplateDto"][];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.MonthlyPackTemplateDto"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    FirmManagement_GetRequestTemplates_GET_api_admin_firm_management_templates_requests: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.RequestTemplateDto"][];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.RequestTemplateDto"][];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.RequestTemplateDto"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    FirmManagement_PutRequestTemplates_PUT_api_admin_firm_management_templates_requests: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.RequestTemplateDto"][];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.RequestTemplateDto"][];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.RequestTemplateDto"][];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.RequestTemplateDto"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    FirmManagement_GetRequiredDocumentTemplates_GET_api_admin_firm_management_templates_required_documents: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.RequiredDocumentTemplateDto"][];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.RequiredDocumentTemplateDto"][];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.RequiredDocumentTemplateDto"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    FirmManagement_PutRequiredDocumentTemplates_PUT_api_admin_firm_management_templates_required_documents: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.RequiredDocumentTemplateDto"][];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.RequiredDocumentTemplateDto"][];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.RequiredDocumentTemplateDto"][];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.FirmManagement.RequiredDocumentTemplateDto"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DataMigration_List_GET_api_admin_migrations: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationSummary"][];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationSummary"][];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationSummary"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DataMigration_Create_POST_api_admin_migrations: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.CreateMigrationRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.CreateMigrationRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.CreateMigrationRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DataMigration_Get_GET_api_admin_migrations_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DataMigration_Approve_POST_api_admin_migrations_id_approve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.ApproveMigrationRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.ApproveMigrationRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.ApproveMigrationRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DataMigration_Spreadsheet_POST_api_admin_migrations_id_clients: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /** Format: binary */
                    file: Blob;
                    /** Format: int32 */
                    version?: number;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DataMigration_EditClient_PUT_api_admin_migrations_id_clients_rowId: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                rowId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.EditMigrationClientRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.EditMigrationClientRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.EditMigrationClientRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DataMigration_BulkEditDocuments_PUT_api_admin_migrations_id_documents: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.BulkMigrationDocumentRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.BulkMigrationDocumentRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.BulkMigrationDocumentRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DataMigration_EditDocument_PUT_api_admin_migrations_id_documents_fileId: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                fileId: string;
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.EditMigrationDocumentRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.EditMigrationDocumentRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.EditMigrationDocumentRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DataMigration_Upload_POST_api_admin_migrations_id_documents_fileId: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                fileId: string;
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /** Format: binary */
                    file: Blob;
                    /** Format: int32 */
                    version?: number;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DataMigration_Download_GET_api_admin_migrations_id_documents_fileId_content: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                fileId: string;
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/octet-stream": Blob;
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    AdminOperations_Get_GET_api_admin_operations: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminOperationsResponse"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminOperationsResponse"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminOperationsResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Admin_GetSetting_GET_api_admin_settings_key: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                key: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_7BB8020ADF3635C7"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Admin_PutSetting_PUT_api_admin_settings_key: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                key: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminSettingRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminSettingRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminSettingRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_7BB8020ADF3635C7"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    SmtpVerification_Status_GET_api_admin_smtp_verification: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_D3EA0BC0074867C4"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    SmtpVerification_Send_POST_api_admin_smtp_verification: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_6F4CA6E344941AF7"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    SmtpVerification_Confirm_POST_api_admin_smtp_verification_confirm: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Auth.ConfirmSmtpRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Auth.ConfirmSmtpRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Auth.ConfirmSmtpRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_D3EA0BC0074867C4"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    TeamProgress_Get_GET_api_admin_team_progress: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.TeamProgressResponse"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.TeamProgressResponse"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.TeamProgressResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Admin_GetUsers_GET_api_admin_users: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_5E407DA0541982CE"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Admin_CreateUser_POST_api_admin_users: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminCreateUserRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminCreateUserRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminCreateUserRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_007E48C86513EA18"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Admin_DisableUser_POST_api_admin_users_id_disable: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_E2705C7C191DDE6C"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Admin_EnableUser_POST_api_admin_users_id_enable: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_E2705C7C191DDE6C"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Admin_ResendInvitation_POST_api_admin_users_id_resend_invitation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_B9BF36DE1611F5FA"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Admin_ResetUserAccess_POST_api_admin_users_id_reset_access: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminResetAccessRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminResetAccessRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminResetAccessRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_396FBB4D6D8C23E7"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Admin_ResetPassword_POST_api_admin_users_id_reset_password: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminResetPasswordRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminResetPasswordRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminResetPasswordRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_396FBB4D6D8C23E7"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Admin_RevokeSessions_POST_api_admin_users_id_revoke_sessions: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_663DA7957586995E"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Admin_UpdateUserRole_PUT_api_admin_users_id_role: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminUpdateRoleRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminUpdateRoleRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminUpdateRoleRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_F11D278F23422B06"] | components["schemas"]["Source.Anonymous_82D248D2EDF80DDB"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Admin_UpdateUserStatus_PUT_api_admin_users_id_status: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminUpdateStatusRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminUpdateStatusRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminUpdateStatusRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_E2705C7C191DDE6C"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Assignments_GetAll_GET_api_assignments: {
        parameters: {
            query?: {
                clientId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Assignments.AssignmentResponse"][];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Assignments.AssignmentResponse"][];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Assignments.AssignmentResponse"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Assignments_Create_POST_api_assignments: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Assignments.CreateAssignmentRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Assignments.CreateAssignmentRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Assignments.CreateAssignmentRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_2AC1D50ADB77B99E"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Assignments_Delete_DELETE_api_assignments_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful response with no body. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Assignments_MakePrimary_POST_api_assignments_id_make_primary: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_2AC1D50ADB77B99E"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Assignments_Reassign_POST_api_assignments_reassign: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Assignments.ReassignAccountantRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Assignments.ReassignAccountantRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Assignments.ReassignAccountantRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_80F498E84D42EC5C"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    AuditLogs_GetAll_GET_api_audit_logs: {
        parameters: {
            query?: {
                clientId?: string;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Models.AuditLog"][];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Models.AuditLog"][];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Models.AuditLog"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Auth_ChangePassword_POST_api_auth_change_password: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.ChangePasswordRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.ChangePasswordRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.ChangePasswordRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_A7B2624949832159"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Auth_CompleteInvite_POST_api_auth_complete_invite: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.CompleteInviteRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.CompleteInviteRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.CompleteInviteRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_A7B2624949832159"] | components["schemas"]["Source.Anonymous_4CC13E8555A2BFC8"];
                };
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Csrf_GetToken_GET_api_auth_csrf: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Auth.CsrfTokenResponse"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Auth.CsrfTokenResponse"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Auth.CsrfTokenResponse"];
                };
            };
        };
    };
    Auth_ForgotPassword_POST_api_auth_forgot_password: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.ForgotPasswordRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.ForgotPasswordRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.ForgotPasswordRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_3AAA36BBF54EB7BB"];
                };
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Auth_Login_POST_api_auth_login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.LoginRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.LoginRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.LoginRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_A7B2624949832159"] | components["schemas"]["Source.Anonymous_4CC13E8555A2BFC8"];
                };
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Auth_Logout_POST_api_auth_logout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful response with no body. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Auth_Me_GET_api_auth_me: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_A3A67283782096AA"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Auth_VerifyMfa_POST_api_auth_mfa_verify: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.MfaVerifyRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.MfaVerifyRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.MfaVerifyRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_4CC13E8555A2BFC8"] | components["schemas"]["Source.Anonymous_EF721FCEB23C5E48"];
                };
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Auth_UpdateProfile_PUT_api_auth_profile: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.UpdateProfileRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.UpdateProfileRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.UpdateProfileRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": string | components["schemas"]["Source.Anonymous_A3A67283782096AA"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Auth_Refresh_POST_api_auth_refresh: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.RefreshTokenRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.RefreshTokenRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.RefreshTokenRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_A7B2624949832159"];
                };
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Auth_Security_GET_api_auth_security: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Auth.SecuritySettingsResponse"] | string;
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Auth_UpdateSecurity_PUT_api_auth_security: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.UpdateSecuritySettingsRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.UpdateSecuritySettingsRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Auth.UpdateSecuritySettingsRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Auth.SecuritySettingsResponse"] | string;
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Auth_Sessions_GET_api_auth_sessions: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Auth.SecuritySessionResponse"][] | string;
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Auth_RevokeSession_DELETE_api_auth_sessions_sessionId: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                sessionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Auth.SessionRevocationResponse"] | string;
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Auth_RevokeOtherSessions_POST_api_auth_sessions_revoke_others: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Auth.SessionRevocationResponse"] | string;
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Banking_Disconnect_POST_api_banking_connections_connectionId_disconnect: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                connectionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankingOverviewDto"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankingOverviewDto"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankingOverviewDto"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingErrorResponse"] | components["schemas"]["Microsoft.AspNetCore.Mvc.ValidationProblemDetails"] | components["schemas"]["SecureClientPortal.Backend.Api.Configuration.PortalApiProblem"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingErrorResponse"] | components["schemas"]["Microsoft.AspNetCore.Mvc.ValidationProblemDetails"] | components["schemas"]["SecureClientPortal.Backend.Api.Configuration.PortalApiProblem"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingErrorResponse"] | components["schemas"]["Microsoft.AspNetCore.Mvc.ValidationProblemDetails"] | components["schemas"]["SecureClientPortal.Backend.Api.Configuration.PortalApiProblem"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Banking_Sync_POST_api_banking_connections_connectionId_sync: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                connectionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankingOverviewDto"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankingOverviewDto"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankingOverviewDto"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingErrorResponse"] | components["schemas"]["Microsoft.AspNetCore.Mvc.ValidationProblemDetails"] | components["schemas"]["SecureClientPortal.Backend.Api.Configuration.PortalApiProblem"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingErrorResponse"] | components["schemas"]["Microsoft.AspNetCore.Mvc.ValidationProblemDetails"] | components["schemas"]["SecureClientPortal.Backend.Api.Configuration.PortalApiProblem"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingErrorResponse"] | components["schemas"]["Microsoft.AspNetCore.Mvc.ValidationProblemDetails"] | components["schemas"]["SecureClientPortal.Backend.Api.Configuration.PortalApiProblem"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Banking_AddManualAccount_POST_api_banking_manual_accounts: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.ManualBankAccountRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.ManualBankAccountRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.ManualBankAccountRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankingOverviewDto"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankingOverviewDto"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankingOverviewDto"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingErrorResponse"] | components["schemas"]["Microsoft.AspNetCore.Mvc.ValidationProblemDetails"] | components["schemas"]["SecureClientPortal.Backend.Api.Configuration.PortalApiProblem"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingErrorResponse"] | components["schemas"]["Microsoft.AspNetCore.Mvc.ValidationProblemDetails"] | components["schemas"]["SecureClientPortal.Backend.Api.Configuration.PortalApiProblem"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingErrorResponse"] | components["schemas"]["Microsoft.AspNetCore.Mvc.ValidationProblemDetails"] | components["schemas"]["SecureClientPortal.Backend.Api.Configuration.PortalApiProblem"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Banking_ImportManualTransactions_POST_api_banking_manual_import: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.ManualTransactionImportRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.ManualTransactionImportRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.ManualTransactionImportRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.ManualTransactionImportResult"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.ManualTransactionImportResult"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.ManualTransactionImportResult"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingErrorResponse"] | components["schemas"]["Microsoft.AspNetCore.Mvc.ValidationProblemDetails"] | components["schemas"]["SecureClientPortal.Backend.Api.Configuration.PortalApiProblem"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingErrorResponse"] | components["schemas"]["Microsoft.AspNetCore.Mvc.ValidationProblemDetails"] | components["schemas"]["SecureClientPortal.Backend.Api.Configuration.PortalApiProblem"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingErrorResponse"] | components["schemas"]["Microsoft.AspNetCore.Mvc.ValidationProblemDetails"] | components["schemas"]["SecureClientPortal.Backend.Api.Configuration.PortalApiProblem"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Banking_GetMonthlyPackStatus_GET_api_banking_monthly_pack_status: {
        parameters: {
            query: {
                clientId: string;
                month: number;
                year: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.MonthlyPackBankingStatusDto"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.MonthlyPackBankingStatusDto"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.MonthlyPackBankingStatusDto"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingErrorResponse"] | components["schemas"]["Microsoft.AspNetCore.Mvc.ValidationProblemDetails"] | components["schemas"]["SecureClientPortal.Backend.Api.Configuration.PortalApiProblem"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingErrorResponse"] | components["schemas"]["Microsoft.AspNetCore.Mvc.ValidationProblemDetails"] | components["schemas"]["SecureClientPortal.Backend.Api.Configuration.PortalApiProblem"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingErrorResponse"] | components["schemas"]["Microsoft.AspNetCore.Mvc.ValidationProblemDetails"] | components["schemas"]["SecureClientPortal.Backend.Api.Configuration.PortalApiProblem"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Banking_GetOverview_GET_api_banking_overview: {
        parameters: {
            query?: {
                clientId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankingOverviewDto"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankingOverviewDto"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankingOverviewDto"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingErrorResponse"] | components["schemas"]["Microsoft.AspNetCore.Mvc.ValidationProblemDetails"] | components["schemas"]["SecureClientPortal.Backend.Api.Configuration.PortalApiProblem"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingErrorResponse"] | components["schemas"]["Microsoft.AspNetCore.Mvc.ValidationProblemDetails"] | components["schemas"]["SecureClientPortal.Backend.Api.Configuration.PortalApiProblem"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingErrorResponse"] | components["schemas"]["Microsoft.AspNetCore.Mvc.ValidationProblemDetails"] | components["schemas"]["SecureClientPortal.Backend.Api.Configuration.PortalApiProblem"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Banking_ConnectSandbox_POST_api_banking_sandbox_connect: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingClientRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingClientRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingClientRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankingOverviewDto"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankingOverviewDto"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankingOverviewDto"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingErrorResponse"] | components["schemas"]["Microsoft.AspNetCore.Mvc.ValidationProblemDetails"] | components["schemas"]["SecureClientPortal.Backend.Api.Configuration.PortalApiProblem"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingErrorResponse"] | components["schemas"]["Microsoft.AspNetCore.Mvc.ValidationProblemDetails"] | components["schemas"]["SecureClientPortal.Backend.Api.Configuration.PortalApiProblem"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Api.Modules.Banking.BankingErrorResponse"] | components["schemas"]["Microsoft.AspNetCore.Mvc.ValidationProblemDetails"] | components["schemas"]["SecureClientPortal.Backend.Api.Configuration.PortalApiProblem"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Clients_GetAll_GET_api_Clients: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Models.Client"][];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Models.Client"][];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Models.Client"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Clients_Create_POST_api_Clients: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Models.Client"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Models.Client"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Models.Client"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Models.Client"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Models.Client"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Models.Client"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Clients_GetById_GET_api_Clients_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Models.Client"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Models.Client"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Models.Client"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Clients_Update_PUT_api_Clients_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Models.Client"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Models.Client"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Models.Client"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Models.Client"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Models.Client"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Models.Client"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Clients_Delete_DELETE_api_Clients_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful response with no body. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Clients_GetBusinessProfile_GET_api_Clients_id_profile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Clients.ClientBusinessProfileResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Clients_UpdateBusinessProfile_PUT_api_Clients_id_profile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Clients.UpdateClientBusinessProfileRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Clients.UpdateClientBusinessProfileRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Clients.UpdateClientBusinessProfileRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Clients.ClientBusinessProfileResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Clients_UpdateStatus_PUT_api_Clients_id_status: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Clients.UpdateClientStatusRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Clients.UpdateClientStatusRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Clients.UpdateClientStatusRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Models.Client"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Models.Client"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Models.Client"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ClientOnboarding_Create_POST_api_clients_onboarding: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Clients.OnboardClientRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Clients.OnboardClientRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Clients.OnboardClientRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Clients.ClientOnboardingResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ClientOnboarding_Options_GET_api_clients_onboarding_options: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Clients.ClientOnboardingOptions"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Compliance_GetAlerts_GET_api_compliance_alerts: {
        parameters: {
            query?: {
                clientId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_C73CE5F0B0F4F370"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ComplianceAutomation_Obligations_GET_api_compliance_automation_obligations: {
        parameters: {
            query?: {
                clientId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceObligationResponse"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ComplianceAutomation_Evidence_GET_api_compliance_automation_obligations_id_evidence: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceEvidenceVersionResponse"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ComplianceAutomation_Evidence_POST_api_compliance_automation_obligations_id_evidence: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /** Format: binary */
                    File: Blob;
                    Note?: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ObligationEvidenceResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ComplianceAutomation_NotApplicable_POST_api_compliance_automation_obligations_id_not_applicable: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.NotApplicableRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.NotApplicableRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.NotApplicableRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceObligationResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ComplianceAutomation_Payment_POST_api_compliance_automation_obligations_id_payment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.PaymentRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.PaymentRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.PaymentRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceObligationResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ComplianceAutomation_Preparation_POST_api_compliance_automation_obligations_id_preparation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.PreparationRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.PreparationRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.PreparationRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceObligationResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ComplianceAutomation_Review_POST_api_compliance_automation_obligations_id_review: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ReviewObligationRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ReviewObligationRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ReviewObligationRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceObligationResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ComplianceAutomation_Submission_POST_api_compliance_automation_obligations_id_submission: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.SubmissionRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.SubmissionRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.SubmissionRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceObligationResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ComplianceAutomation_Profile_GET_api_compliance_automation_profiles_clientId: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                clientId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ClientComplianceProfile"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ComplianceAutomation_Profile_PUT_api_compliance_automation_profiles_clientId: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                clientId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ClientComplianceProfile"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ClientComplianceProfile"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ClientComplianceProfile"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ClientComplianceProfile"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ComplianceAutomation_Rules_GET_api_compliance_automation_rules: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceRuleSet"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ComplianceAutomation_Rules_PUT_api_compliance_automation_rules: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.UpdateComplianceRulesRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.UpdateComplianceRulesRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.UpdateComplianceRulesRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceRuleSet"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ComplianceAutomation_Run_POST_api_compliance_automation_run: {
        parameters: {
            query?: {
                clientId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceAutomationRunResult"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Compliance_GetCategories_GET_api_compliance_categories: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Models.ComplianceCategory"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Compliance_CreateCategory_POST_api_compliance_categories: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.CreateComplianceCategoryRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.CreateComplianceCategoryRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.CreateComplianceCategoryRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Models.ComplianceCategory"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Compliance_SeedDefaultCategories_POST_api_compliance_categories_seed_defaults: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_2CAE675DE909CC14"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Compliance_DownloadEvidence_GET_api_compliance_evidence_versionId_download: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                versionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/octet-stream": Blob;
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Compliance_GetHistory_GET_api_compliance_history: {
        parameters: {
            query?: {
                clientId?: string;
                itemId?: string;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceHistoryEntryResponse"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Compliance_GetItems_GET_api_compliance_items: {
        parameters: {
            query?: {
                clientId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_A8B2CA516AE40F95"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Compliance_CreateItem_POST_api_compliance_items: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.CreateComplianceItemRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.CreateComplianceItemRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.CreateComplianceItemRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_A8B2CA516AE40F95"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Compliance_UpdateItem_PUT_api_compliance_items_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.UpdateComplianceItemRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.UpdateComplianceItemRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.UpdateComplianceItemRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_A8B2CA516AE40F95"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Compliance_GetEvidenceVersions_GET_api_compliance_items_id_evidence: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceEvidenceVersionResponse"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Compliance_UploadEvidence_POST_api_compliance_items_id_evidence: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /** Format: binary */
                    File: Blob;
                    Note?: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceEvidenceVersionResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Compliance_CreateWorkflowRequest_POST_api_compliance_items_id_request: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.CreateComplianceWorkflowRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.CreateComplianceWorkflowRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.CreateComplianceWorkflowRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Models.RequestItem"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ComplianceMonitoring_Get_GET_api_compliance_monitoring_clientId: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                clientId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceMonitoringResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ComplianceMonitoring_Update_PUT_api_compliance_monitoring_clientId: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                clientId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.UpdateComplianceMonitoringRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.UpdateComplianceMonitoringRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.UpdateComplianceMonitoringRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceMonitoringResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ComplianceMonitoring_VerifyCipc_POST_api_compliance_monitoring_clientId_authority_verifications_cipc: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                clientId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.RunAuthorityVerificationRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.RunAuthorityVerificationRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.RunAuthorityVerificationRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceMonitoringResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ComplianceMonitoring_History_GET_api_compliance_monitoring_clientId_history: {
        parameters: {
            query?: {
                checkCode?: string;
                page?: number;
            };
            header?: never;
            path: {
                clientId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.VerificationResponse"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ComplianceMonitoring_RecordManual_POST_api_compliance_monitoring_clientId_manual_verifications: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                clientId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.RecordManualVerificationRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.RecordManualVerificationRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.RecordManualVerificationRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.ComplianceMonitoringResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Compliance_GetReminders_GET_api_compliance_reminders: {
        parameters: {
            query?: {
                clientId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Models.ComplianceReminder"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Compliance_CreateReminder_POST_api_compliance_reminders: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.CreateComplianceReminderRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.CreateComplianceReminderRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.CreateComplianceReminderRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Models.ComplianceReminder"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Compliance_UpdateReminderStatus_PUT_api_compliance_reminders_id_status: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.UpdateComplianceReminderStatusRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.UpdateComplianceReminderStatusRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Compliance.UpdateComplianceReminderStatusRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Models.ComplianceReminder"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Compliance_GetSummaryReport_GET_api_compliance_reports_summary: {
        parameters: {
            query?: {
                clientId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_62539CD109EF9413"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DocumentSlots_Create_POST_api_document_slots: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.CreateDocumentSlotRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.CreateDocumentSlotRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.CreateDocumentSlotRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.DocumentSlotResponse"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.DocumentSlotResponse"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.DocumentSlotResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DocumentSlots_GetByMonthlyPackId_GET_api_document_slots_monthlyPackId: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                monthlyPackId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.DocumentSlotResponse"][];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.DocumentSlotResponse"][];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.DocumentSlotResponse"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DocumentSlots_Approve_POST_api_document_slots_slotId_approve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slotId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.ApproveDocumentSlotRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.ApproveDocumentSlotRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.ApproveDocumentSlotRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_877D613AAD4AF1A9"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DocumentSlots_MarkNotApplicable_POST_api_document_slots_slotId_not_applicable: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slotId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.DocumentSlotResponse"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.DocumentSlotResponse"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.DocumentSlotResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DocumentSlots_Reject_POST_api_document_slots_slotId_reject: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slotId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.RejectDocumentSlotRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.RejectDocumentSlotRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.RejectDocumentSlotRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_877D613AAD4AF1A9"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DocumentSlots_RequestReupload_POST_api_document_slots_slotId_request_reupload: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slotId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.RequestDocumentSlotReuploadRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.RequestDocumentSlotReuploadRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.RequestDocumentSlotReuploadRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_877D613AAD4AF1A9"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DocumentSlots_StartReview_POST_api_document_slots_slotId_start_review: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slotId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.StartDocumentSlotReviewRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.StartDocumentSlotReviewRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.StartDocumentSlotReviewRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_877D613AAD4AF1A9"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DocumentSlots_Submit_POST_api_document_slots_slotId_submit: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slotId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.DocumentSlotResponse"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.DocumentSlotResponse"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.DocumentSlotResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DocumentSlots_Upload_POST_api_document_slots_slotId_upload: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slotId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /** Format: binary */
                    File: Blob;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.DocumentSlotResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DocumentSlots_GetVersions_GET_api_document_slots_slotId_versions: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slotId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_D999510D6F7DF38D"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DocumentSlots_GetWorkspace_GET_api_document_slots_slotId_workspace: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slotId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.DocumentSlotWorkspaceResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Documents_GetAll_GET_api_documents: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Domain.Modules.Documents.Document"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Documents_Create_POST_api_documents: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.CreateDocumentRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.CreateDocumentRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.CreateDocumentRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Domain.Modules.Documents.Document"] | components["schemas"]["Source.Anonymous_20DA44C347CE5D57"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    InvoiceReview_Get_GET_api_documents_documentId_invoice_review: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                documentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewResponse"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewResponse"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    InvoiceReview_Save_POST_api_documents_documentId_invoice_review_corrections: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                documentId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.SaveInvoiceReviewRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.SaveInvoiceReviewRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.SaveInvoiceReviewRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewResponse"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewResponse"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Documents_GetById_GET_api_documents_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_EE85ECF79EC892D7"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Documents_Update_PUT_api_documents_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.UpdateDocumentRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.UpdateDocumentRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.UpdateDocumentRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Domain.Modules.Documents.Document"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Documents_Delete_DELETE_api_documents_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful response with no body. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DocumentArchive_Place_PUT_api_documents_id_archive_placement: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.ArchivePlacementRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.ArchivePlacementRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.ArchivePlacementRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.ArchivePlacementResponse"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.ArchivePlacementResponse"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.ArchivePlacementResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DocumentChecklist_Link_POST_api_documents_id_checklist_link: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.LinkDocumentChecklistRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.LinkDocumentChecklistRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.LinkDocumentChecklistRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Domain.Modules.MonthlyPacks.DocumentSlot"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Domain.Modules.MonthlyPacks.DocumentSlot"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Domain.Modules.MonthlyPacks.DocumentSlot"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Documents_GetComments_GET_api_documents_id_comments: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Domain.Modules.Documents.DocumentComment"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Documents_AddComment_POST_api_documents_id_comments: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.AddDocumentCommentRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.AddDocumentCommentRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.AddDocumentCommentRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Domain.Modules.Documents.DocumentComment"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Documents_Download_GET_api_documents_id_download: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/octet-stream": Blob;
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Documents_RequestReupload_POST_api_documents_id_request_reupload: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.RequestReuploadRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.RequestReuploadRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.RequestReuploadRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_877D613AAD4AF1A9"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Documents_Review_POST_api_documents_id_review: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.AddReviewDecisionRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.AddReviewDecisionRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.AddReviewDecisionRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_877D613AAD4AF1A9"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Documents_UpdateStatus_PUT_api_documents_id_status: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.UpdateDocumentStatusRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.UpdateDocumentStatusRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.UpdateDocumentStatusRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Domain.Modules.Documents.Document"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Documents_GetVersions_GET_api_documents_id_versions: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_D999510D6F7DF38D"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Documents_GetFilingRegister_GET_api_documents_filing_register: {
        parameters: {
            query?: {
                clientId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Domain.Modules.Documents.Document"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Documents_GetFilingRules_GET_api_documents_filing_rules: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Domain.Modules.Documents.FilingRule"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Documents_UpdateFilingRule_PUT_api_documents_filing_rules_category: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                category: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.FilingRuleUpdateRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.FilingRuleUpdateRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.FilingRuleUpdateRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Domain.Modules.Documents.FilingRule"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Documents_UploadStream_POST_api_documents_upload: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.UploadDocumentRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_9A340C529CFCAB52"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    FirmBranding_Get_GET_api_firm_branding: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.FirmManagement.FirmBrandingResponse"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Api.Modules.FirmManagement.FirmBrandingResponse"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Api.Modules.FirmManagement.FirmBrandingResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ClientMonthlyPackProfiles_Get_GET_api_monthly_pack_profiles_clientId: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                clientId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.ClientMonthlyPackProfileDto"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ClientMonthlyPackProfiles_Update_PUT_api_monthly_pack_profiles_clientId: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                clientId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.UpdateClientMonthlyPackProfileRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.UpdateClientMonthlyPackProfileRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.UpdateClientMonthlyPackProfileRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.ClientMonthlyPackProfileDto"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ClientMonthlyPackProfiles_AddItem_POST_api_monthly_pack_profiles_clientId_items: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                clientId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.AddClientMonthlyPackItemRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.AddClientMonthlyPackItemRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.AddClientMonthlyPackItemRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.AddClientMonthlyPackItemResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ClientMonthlyPackProfiles_ReconcileCurrentPack_POST_api_monthly_pack_profiles_clientId_reconcile_current_pack: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                clientId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.MonthlyPackReconciliationResultDto"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ClientMonthlyPackProfiles_ApproveRecurring_POST_api_monthly_pack_profiles_clientId_recurring_requestId_approve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                clientId: string;
                requestId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.ClientMonthlyPackProfileDto"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ClientMonthlyPackProfiles_DeclineRecurring_POST_api_monthly_pack_profiles_clientId_recurring_requestId_decline: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                clientId: string;
                requestId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.ClientMonthlyPackProfileDto"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    MonthlyPacks_GetAll_GET_api_monthly_packs: {
        parameters: {
            query?: {
                clientId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.MonthlyPackResponse"][];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.MonthlyPackResponse"][];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.MonthlyPackResponse"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    MonthlyPacks_Create_POST_api_monthly_packs: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.CreateMonthlyPackRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.CreateMonthlyPackRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.CreateMonthlyPackRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.MonthlyPackResponse"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.MonthlyPackResponse"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.MonthlyPackResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    MonthlyPacks_GetByClientAndPeriod_GET_api_monthly_packs_clientId_year_month: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                clientId: string;
                month: number;
                year: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.MonthlyPackResponse"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.MonthlyPackResponse"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.MonthlyPackResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    MonthlyPacks_Close_POST_api_monthly_packs_id_close: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.MonthlyPackResponse"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.MonthlyPackResponse"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.MonthlyPackResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    MonthlyPacks_Submit_POST_api_monthly_packs_id_submit: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.MonthlyPackResponse"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.MonthlyPackResponse"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.MonthlyPackResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Notifications_GetMine_GET_api_notifications: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Models.Notification"][];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Models.Notification"][];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Models.Notification"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Notifications_MarkAsRead_POST_api_notifications_id_mark_read: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Models.Notification"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Models.Notification"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Models.Notification"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Notifications_MarkAllRead_POST_api_notifications_mark_all_read: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_B087961A8D3064F8"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Notifications_GetPreferences_GET_api_notifications_preferences: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Notifications.NotificationPreferenceResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Notifications_UpdatePreferences_PUT_api_notifications_preferences: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Notifications.UpdateNotificationPreferenceRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Notifications.UpdateNotificationPreferenceRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Notifications.UpdateNotificationPreferenceRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Notifications.NotificationPreferenceResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Automation_Run_POST_api_platform_automation_run: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Modules.Platform.AutomationRunSummary"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Reports_GetAccountantReports_GET_api_reports_accountants: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_B9D995E5CB0B554E"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Reports_GetClientReports_GET_api_reports_clients: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_90200779D599B7E1"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Reports_DownloadCompliancePdf_GET_api_reports_compliance_pdf: {
        parameters: {
            query?: {
                clientId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/octet-stream": Blob;
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Reports_GetFirmReports_GET_api_reports_firm: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_79F4760F842BA5F4"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Reports_GetOperationsDashboard_GET_api_reports_operations: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_99FB1EEAA61A925F"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Reports_GetSchedules_GET_api_reports_schedules: {
        parameters: {
            query?: {
                clientId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Reports.ReportScheduleResponse"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Reports_CreateSchedule_POST_api_reports_schedules: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Reports.CreateReportScheduleRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Reports.CreateReportScheduleRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Reports.CreateReportScheduleRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Reports.ReportScheduleResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Reports_UpdateSchedule_PUT_api_reports_schedules_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Reports.UpdateReportScheduleRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Reports.UpdateReportScheduleRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Reports.UpdateReportScheduleRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Reports.ReportScheduleResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Reports_DeleteSchedule_DELETE_api_reports_schedules_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful response with no body. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Requests_GetAll_GET_api_requests: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Models.RequestItem"][];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Models.RequestItem"][];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Models.RequestItem"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Requests_Create_POST_api_requests: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Requests.CreateRequestRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Requests.CreateRequestRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Requests.CreateRequestRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Models.RequestItem"] | components["schemas"]["Source.Anonymous_20DA44C347CE5D57"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Requests_GetById_GET_api_requests_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Models.RequestItem"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Models.RequestItem"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Models.RequestItem"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Requests_Update_PUT_api_requests_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Requests.UpdateRequestRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Requests.UpdateRequestRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Requests.UpdateRequestRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Models.RequestItem"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Requests_Delete_DELETE_api_requests_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful response with no body. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Requests_GetComments_GET_api_requests_id_comments: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Models.RequestComment"][];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Models.RequestComment"][];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Models.RequestComment"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Requests_AddComment_POST_api_requests_id_comments: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Requests.AddRequestCommentRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Requests.AddRequestCommentRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Requests.AddRequestCommentRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Models.RequestComment"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Requests_Escalate_POST_api_requests_id_escalate: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Requests.EscalateRequestRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Requests.EscalateRequestRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Requests.EscalateRequestRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Models.RequestItem"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Requests_MarkRead_POST_api_requests_id_read: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Requests.RequestReadStateResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Requests_Resolve_POST_api_requests_id_resolve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Requests.ResolveRequestRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Requests.ResolveRequestRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Requests.ResolveRequestRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Models.RequestItem"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Requests_UpdateStatus_PATCH_api_requests_id_status: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Requests.UpdateRequestStatusRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Requests.UpdateRequestStatusRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Requests.UpdateRequestStatusRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Models.RequestItem"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Requests_UploadStream_POST_api_requests_id_upload: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Requests.UploadRequestDocumentRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Requests.RequestDocumentUploadResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Requests_GetWorkspace_GET_api_requests_id_workspace: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Requests.RequestWorkspaceResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Requests_GetReadState_GET_api_requests_read_state: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.Requests.RequestReadStateResponse"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ReviewQueue_GetPending_GET_api_review_queue: {
        parameters: {
            query?: {
                ClientId?: string;
                DocumentCategory?: string;
                MinAgeDays?: number;
                Priority?: string;
                SlotStatus?: string;
                Sort?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.ReviewQueue.ReviewQueueItemResponse"][];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.ReviewQueue.ReviewQueueItemResponse"][];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.ReviewQueue.ReviewQueueItemResponse"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ReviewQueue_GetWorkspace_GET_api_review_queue_documentId: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                documentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Application.Contracts.Modules.ReviewQueue.ReviewQueueWorkspaceResponse"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ReviewQueue_AddComment_POST_api_review_queue_documentId_comments: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                documentId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.AddDocumentCommentRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.AddDocumentCommentRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.AddDocumentCommentRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.SecureClientPortal.Backend.Domain.Modules.Documents.DocumentComment"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ReviewQueue_RequestReupload_POST_api_review_queue_documentId_request_reupload: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                documentId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.RequestReuploadRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.RequestReuploadRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.RequestReuploadRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_877D613AAD4AF1A9"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ReviewQueue_Review_POST_api_review_queue_documentId_review: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                documentId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.AddReviewDecisionRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.AddReviewDecisionRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.AddReviewDecisionRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_877D613AAD4AF1A9"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Roles_GetAll_GET_api_roles: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.RoleResponse"][];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.RoleResponse"][];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.RoleResponse"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Roles_Create_POST_api_roles: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.CreateRoleRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.CreateRoleRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.CreateRoleRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_F080ABFCC0F8D418"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Roles_Update_PUT_api_roles_name: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                name: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.UpdateRoleRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.UpdateRoleRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.UpdateRoleRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_F080ABFCC0F8D418"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Roles_Activate_POST_api_roles_name_activate: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                name: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_9A98D21AEB5A3D41"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Roles_Deactivate_POST_api_roles_name_deactivate: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                name: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_9A98D21AEB5A3D41"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Roles_Access_GET_api_roles_access: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.RoleManagementAccess"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.RoleManagementAccess"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.RoleManagementAccess"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Tasks_GetAll_GET_api_tasks: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Models.TaskItem"][];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Models.TaskItem"][];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Models.TaskItem"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Tasks_Create_POST_api_tasks: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Models.TaskItem"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Models.TaskItem"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Models.TaskItem"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Models.TaskItem"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Models.TaskItem"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Models.TaskItem"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Tasks_GetById_GET_api_tasks_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Models.TaskItem"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Models.TaskItem"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Models.TaskItem"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Tasks_Update_PUT_api_tasks_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Models.TaskItem"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Models.TaskItem"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Models.TaskItem"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecureClientPortal.Backend.Models.TaskItem"];
                    "text/json": components["schemas"]["SecureClientPortal.Backend.Models.TaskItem"];
                    "text/plain": components["schemas"]["SecureClientPortal.Backend.Models.TaskItem"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Tasks_Delete_DELETE_api_tasks_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful response with no body. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Users_GetAll_GET_api_users: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_F0BB22A31033A626"][];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Users_Create_POST_api_users: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.CreateUserRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.CreateUserRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.CreateUserRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_D4117D750113A76B"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Users_Activate_POST_api_users_id_activate: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_213A8F280BB41FF7"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Users_Deactivate_POST_api_users_id_deactivate: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/*+json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.UpdateUserActivationRequest"];
                "application/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.UpdateUserActivationRequest"];
                "text/json": components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.UpdateUserActivationRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_213A8F280BB41FF7"];
                };
            };
            /** @description Sign-in required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Client access denied, role denied, or CSRF validation failed. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    Health_GetServiceHealth_GET_health: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_F4BC5AC777FE3F31"];
                };
            };
        };
    };
    Health_GetDatabaseHealth_GET_health_db: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Source.Anonymous_783B1C4893B2FA97"];
                };
            };
        };
    };
}
