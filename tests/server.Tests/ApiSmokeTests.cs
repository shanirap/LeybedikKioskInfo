using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using LeybedikInfoKiosk.Server.DTOs;
using Xunit;

namespace LeybedikInfoKiosk.Server.Tests;

public class ApiSmokeTests
{
    [Fact]
    public async Task Login_WithValidCredentials_ReturnsToken()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("admin@test.local", "Admin123!"));

        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<LoginResponse>();

        Assert.NotNull(auth);
        Assert.False(string.IsNullOrWhiteSpace(auth.Token));
        Assert.Equal("Admin", auth.Role);
    }

    [Fact]
    public async Task Login_WithInvalidCredentials_ReturnsUnauthorized()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("admin@test.local", "wrong-password"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_WithInactiveUser_ReturnsUnauthorized()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("inactive@test.local", "Teacher123!"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Teacher_CannotAccessAdminEndpoint()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        var response = await client.GetAsync("/api/admin/users");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AnonymousUser_CannotAccessProtectedEndpoint()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/materials/approved");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Instruments_ReturnsRoleScopedActiveInstruments()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var teacherClient = factory.CreateClient();
        await SignIn(teacherClient, "teacher@test.local", "Teacher123!");
        using var adminClient = factory.CreateClient();
        await SignIn(adminClient, "admin@test.local", "Admin123!");

        var teacherResponse = await teacherClient.GetAsync("/api/instruments");
        var adminResponse = await adminClient.GetAsync("/api/instruments");

        teacherResponse.EnsureSuccessStatusCode();
        adminResponse.EnsureSuccessStatusCode();
        var teacherInstruments = await teacherResponse.Content.ReadFromJsonAsync<List<InstrumentDto>>();
        var adminInstruments = await adminResponse.Content.ReadFromJsonAsync<List<InstrumentDto>>();

        Assert.NotNull(teacherInstruments);
        Assert.NotNull(adminInstruments);
        Assert.Single(teacherInstruments);
        Assert.Equal("Piano", teacherInstruments[0].Name);
        Assert.Contains(adminInstruments, instrument => instrument.Name == "Piano");
        Assert.Contains(adminInstruments, instrument => instrument.Name == "Violin");
    }

    [Fact]
    public async Task Teacher_SeesOnlyApprovedMaterialsForAssignedInstruments()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        var response = await client.GetAsync("/api/materials/approved");

        response.EnsureSuccessStatusCode();
        var materials = await response.Content.ReadFromJsonAsync<List<MaterialDto>>();

        Assert.NotNull(materials);
        Assert.Contains(materials, material => material.Title == "Assigned Approved");
        Assert.DoesNotContain(materials, material => material.Title == "Unassigned Approved");
        Assert.DoesNotContain(materials, material => material.Title == "Assigned Pending");
    }

    [Fact]
    public async Task MyUploads_ReturnsCurrentTeachersMaterialsOnly()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        var response = await client.GetAsync("/api/materials/my-uploads");

        response.EnsureSuccessStatusCode();
        var materials = await response.Content.ReadFromJsonAsync<List<MaterialDto>>();

        Assert.NotNull(materials);
        Assert.Contains(materials, material => material.Title == "Assigned Approved");
        Assert.Contains(materials, material => material.Title == "Unassigned Approved");
        Assert.Contains(materials, material => material.Title == "Assigned Pending");
    }

    [Fact]
    public async Task Upload_WithValidPdf_CreatesPendingMaterial()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        using var form = new MultipartFormDataContent();
        form.Add(new StringContent("  New Etude  "), "title");
        form.Add(new StringContent("  Practice slowly  "), "description");
        form.Add(new StringContent("1"), "instrumentId");
        form.Add(new StreamContent(new MemoryStream("%PDF-1.4"u8.ToArray()))
        {
            Headers = { ContentType = new MediaTypeHeaderValue("application/pdf") },
        }, "file", "etude.pdf");

        var response = await client.PostAsync("/api/materials/upload", form);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var material = await response.Content.ReadFromJsonAsync<MaterialDto>();

        Assert.NotNull(material);
        Assert.Equal("New Etude", material.Title);
        Assert.Equal("Practice slowly", material.Description);
        Assert.Equal("Pending", material.Status);
        Assert.Equal("etude.pdf", material.FileName);
    }

    [Fact]
    public async Task Upload_RejectsUnsupportedFileType()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        using var form = new MultipartFormDataContent();
        form.Add(new StringContent("Unsupported"), "title");
        form.Add(new StringContent("1"), "instrumentId");
        form.Add(new StreamContent(new MemoryStream("plain text"u8.ToArray()))
        {
            Headers = { ContentType = new MediaTypeHeaderValue("text/plain") },
        }, "file", "notes.txt");

        var response = await client.PostAsync("/api/materials/upload", form);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Teacher_CannotUploadForUnassignedInstrument()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        using var form = new MultipartFormDataContent();
        form.Add(new StringContent("Violin Upload"), "title");
        form.Add(new StringContent("2"), "instrumentId");
        form.Add(new StreamContent(new MemoryStream("%PDF-1.4"u8.ToArray()))
        {
            Headers = { ContentType = new MediaTypeHeaderValue("application/pdf") },
        }, "file", "violin.pdf");

        var response = await client.PostAsync("/api/materials/upload", form);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Download_ApprovedMaterial_ReturnsFileAndIncrementsDownloadCount()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        var downloadResponse = await client.GetAsync("/api/materials/1/download");

        downloadResponse.EnsureSuccessStatusCode();
        Assert.Equal("application/pdf", downloadResponse.Content.Headers.ContentType?.MediaType);

        var materialsResponse = await client.GetAsync("/api/materials/approved");
        materialsResponse.EnsureSuccessStatusCode();
        var materials = await materialsResponse.Content.ReadFromJsonAsync<List<MaterialDto>>();
        var material = Assert.Single(materials!, item => item.Id == 1);

        Assert.Equal(1, material.DownloadCount);
    }

    [Fact]
    public async Task Preview_AllowsTeacherToPreviewOwnPendingMaterial()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        var response = await client.GetAsync("/api/materials/3/preview");

        response.EnsureSuccessStatusCode();
        Assert.Equal("application/pdf", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task LikingSameMaterialTwice_IncrementsOnlyOnce()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        var first = await client.PostAsync("/api/materials/1/like", null);
        var second = await client.PostAsync("/api/materials/1/like", null);

        first.EnsureSuccessStatusCode();
        second.EnsureSuccessStatusCode();

        var response = await client.GetAsync("/api/materials/approved");
        response.EnsureSuccessStatusCode();
        var materials = await response.Content.ReadFromJsonAsync<List<MaterialDto>>();
        var material = Assert.Single(materials!, m => m.Id == 1);

        Assert.Equal(1, material.LikeCount);
        Assert.True(material.IsLikedByCurrentUser);
    }

    [Fact]
    public async Task Like_UnassignedMaterial_ReturnsNotFoundForTeacher()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        var response = await client.PostAsync("/api/materials/2/like", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Admin_CanCreateAndUpdateUser()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var createResponse = await client.PostAsJsonAsync("/api/admin/users", new
        {
            fullName = "New Teacher",
            email = "new.teacher@test.local",
            password = "Teacher123!",
            role = "Teacher",
            isActive = true,
            instrumentIds = new[] { 1 },
        });

        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<AdminUserDto>();
        Assert.NotNull(created);

        var updateResponse = await client.PutAsJsonAsync($"/api/admin/users/{created!.Id}", new
        {
            fullName = "Updated Teacher",
            email = "updated.teacher@test.local",
            role = "Teacher",
            isActive = false,
        });

        updateResponse.EnsureSuccessStatusCode();
        var updated = await updateResponse.Content.ReadFromJsonAsync<AdminUserDto>();

        Assert.NotNull(updated);
        Assert.Equal("Updated Teacher", updated.FullName);
        Assert.False(updated.IsActive);
    }

    [Fact]
    public async Task Admin_CreateUserWithDuplicateEmail_ReturnsConflict()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var response = await client.PostAsJsonAsync("/api/admin/users", new
        {
            fullName = "Duplicate Teacher",
            email = "TEACHER@test.local",
            password = "Teacher123!",
            role = "Teacher",
            isActive = true,
            instrumentIds = new[] { 1 },
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Admin_CanUpdateTeacherInstruments()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var response = await client.PutAsJsonAsync("/api/admin/users/2/instruments", new
        {
            instrumentIds = new[] { 1, 2 },
        });

        response.EnsureSuccessStatusCode();
        var user = await response.Content.ReadFromJsonAsync<AdminUserDto>();

        Assert.NotNull(user);
        Assert.Contains(user.Instruments, instrument => instrument.Name == "Piano");
        Assert.Contains(user.Instruments, instrument => instrument.Name == "Violin");
    }

    [Fact]
    public async Task Admin_CannotAssignInstrumentsToAdminUser()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var response = await client.PutAsJsonAsync("/api/admin/users/1/instruments", new
        {
            instrumentIds = new[] { 1 },
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Admin_CanResetUserPassword()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var resetResponse = await client.PutAsJsonAsync("/api/admin/users/2/password", new
        {
            newPassword = "NewTeacher123!",
        });
        client.DefaultRequestHeaders.Authorization = null;
        var oldLogin = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("teacher@test.local", "Teacher123!"));
        var newLogin = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("teacher@test.local", "NewTeacher123!"));

        resetResponse.EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Unauthorized, oldLogin.StatusCode);
        newLogin.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Account_ChangePassword_ValidatesCurrentPasswordAndUpdatesLogin()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        var invalidResponse = await client.PutAsJsonAsync("/api/account/password", new
        {
            currentPassword = "wrong-password",
            newPassword = "Changed123!",
        });
        var validResponse = await client.PutAsJsonAsync("/api/account/password", new
        {
            currentPassword = "Teacher123!",
            newPassword = "Changed123!",
        });
        client.DefaultRequestHeaders.Authorization = null;
        var loginResponse = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("teacher@test.local", "Changed123!"));

        Assert.Equal(HttpStatusCode.BadRequest, invalidResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, validResponse.StatusCode);
        loginResponse.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Admin_CanCreateAndUpdateInstrument()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var createResponse = await client.PostAsJsonAsync("/api/admin/instruments", new
        {
            name = "  Flute  ",
            isActive = true,
        });
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<InstrumentDto>();

        var updateResponse = await client.PutAsJsonAsync($"/api/admin/instruments/{created!.Id}", new
        {
            name = "Clarinet",
            isActive = false,
        });

        updateResponse.EnsureSuccessStatusCode();
        var updated = await updateResponse.Content.ReadFromJsonAsync<InstrumentDto>();

        Assert.NotNull(updated);
        Assert.Equal("Clarinet", updated.Name);
        Assert.False(updated.IsActive);
    }

    [Fact]
    public async Task Admin_CreateInstrumentWithDuplicateName_ReturnsConflict()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var response = await client.PostAsJsonAsync("/api/admin/instruments", new
        {
            name = "Piano",
            isActive = true,
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Admin_ApproveMaterial_WritesAuditLog()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var approveResponse = await client.PostAsync("/api/admin/materials/3/approve", null);
        approveResponse.EnsureSuccessStatusCode();

        var auditResponse = await client.GetAsync("/api/admin/audit-logs");
        auditResponse.EnsureSuccessStatusCode();
        var logs = await auditResponse.Content.ReadFromJsonAsync<List<AuditLogDto>>();

        Assert.NotNull(logs);
        Assert.Contains(logs, log => log.Action == "ApproveMaterial" && log.EntityId == 3);
    }

    [Fact]
    public async Task Admin_RejectMaterial_WritesAuditLogAndRemovesFromPending()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var rejectResponse = await client.PostAsync("/api/admin/materials/3/reject", null);
        var pendingResponse = await client.GetAsync("/api/admin/materials/pending");
        var auditResponse = await client.GetAsync("/api/admin/audit-logs");

        rejectResponse.EnsureSuccessStatusCode();
        pendingResponse.EnsureSuccessStatusCode();
        auditResponse.EnsureSuccessStatusCode();
        var pending = await pendingResponse.Content.ReadFromJsonAsync<List<MaterialDto>>();
        var logs = await auditResponse.Content.ReadFromJsonAsync<List<AuditLogDto>>();

        Assert.NotNull(pending);
        Assert.NotNull(logs);
        Assert.DoesNotContain(pending, material => material.Id == 3);
        Assert.Contains(logs, log => log.Action == "RejectMaterial" && log.EntityId == 3);
    }

    [Fact]
    public async Task Admin_MaterialsCanBeFilteredByStatus()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var response = await client.GetAsync("/api/admin/materials?status=Pending");

        response.EnsureSuccessStatusCode();
        var materials = await response.Content.ReadFromJsonAsync<List<MaterialDto>>();

        Assert.NotNull(materials);
        Assert.Single(materials);
        Assert.Equal("Assigned Pending", materials[0].Title);
    }

    [Fact]
    public async Task AuditLogs_AreAdminOnly()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        var response = await client.GetAsync("/api/admin/audit-logs");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private static async Task SignIn(HttpClient client, string email, string password)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));
        response.EnsureSuccessStatusCode();

        var auth = await response.Content.ReadFromJsonAsync<LoginResponse>()
            ?? throw new InvalidOperationException("Login response was empty.");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
    }
}
