using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using LeybedikInfoKiosk.Server.Data;
using LeybedikInfoKiosk.Server.DTOs;
using LeybedikInfoKiosk.Server.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace LeybedikInfoKiosk.Server.Tests;

/// <summary>Local deserialization helper for paged API responses.</summary>
file record TestPagedResult<T>(List<T> Items, int TotalCount, int Page, int PageSize);

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
    public async Task Login_NormalizesEmailBeforeLookup()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("  ADMIN@TEST.LOCAL  ", "Admin123!"));

        response.EnsureSuccessStatusCode();
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
    public async Task UnknownApiRoute_ReturnsNotFoundInsteadOfSpaFallback()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/not-a-real-endpoint");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
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
        var paged = await response.Content.ReadFromJsonAsync<TestPagedResult<MaterialDto>>();

        Assert.NotNull(paged);
        Assert.Contains(paged.Items, material => material.Title == "Assigned Approved");
        Assert.Contains(paged.Items, material => material.Title == "Unassigned Approved");
        Assert.Contains(paged.Items, material => material.Title == "Assigned Pending");
    }

    [Fact]
    public async Task Upload_WithValidPdf_CreatesPendingMaterial()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        using var form = CreateUploadForm(
            "  New Etude  ",
            1,
            "%PDF-1.4"u8.ToArray(),
            "etude.pdf",
            "application/pdf",
            "  Practice slowly  ",
            "Advanced");

        var response = await client.PostAsync("/api/materials/upload", form);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var material = await response.Content.ReadFromJsonAsync<MaterialDto>();

        Assert.NotNull(material);
        Assert.Equal("New Etude", material.Title);
        Assert.Equal("Practice slowly", material.Description);
        Assert.Equal("Advanced", material.Level);
        Assert.Equal("Pending", material.Status);
        Assert.Equal("etude.pdf", material.FileName);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var stored = await db.Materials.FindAsync(material.Id);
        Assert.NotNull(stored);
        Assert.Equal(MaterialLevel.Advanced, stored.Level);
        Assert.Equal("etude.pdf", stored.OriginalFileName);
        Assert.NotEqual("etude.pdf", Path.GetFileName(stored.OriginalFilePath));
        Assert.Matches(@"^originals[\\/][0-9a-f]{32}\.pdf$", stored.OriginalFilePath);
    }

    [Fact]
    public async Task Upload_RejectsEmptyFile()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        using var form = CreateUploadForm(
            "Empty",
            1,
            [],
            "empty.pdf",
            "application/pdf");

        var response = await client.PostAsync("/api/materials/upload", form);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Upload_RejectsWhitespaceOnlyTitle()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        using var form = CreateUploadForm(
            "   ",
            1,
            "%PDF-1.4"u8.ToArray(),
            "blank-title.pdf",
            "application/pdf");

        var response = await client.PostAsync("/api/materials/upload", form);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Upload_RejectsUnsupportedFileType()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        using var form = CreateUploadForm(
            "Unsupported",
            1,
            "plain text"u8.ToArray(),
            "notes.txt",
            "text/plain");

        var response = await client.PostAsync("/api/materials/upload", form);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Upload_RejectsMismatchedContentType()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        using var form = CreateUploadForm(
            "Mismatched",
            1,
            "%PDF-1.4"u8.ToArray(),
            "mismatched.pdf",
            "text/plain");

        var response = await client.PostAsync("/api/materials/upload", form);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Upload_RejectsMismatchedFileSignature()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        using var form = CreateUploadForm(
            "Bad Signature",
            1,
            "not a pdf"u8.ToArray(),
            "bad.pdf",
            "application/pdf");

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

        using var form = CreateUploadForm(
            "Violin Upload",
            2,
            "%PDF-1.4"u8.ToArray(),
            "violin.pdf",
            "application/pdf");

        var response = await client.PostAsync("/api/materials/upload", form);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Admin_CanUploadForActiveInstrument()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        using var form = CreateUploadForm(
            "Admin Upload",
            2,
            "%PDF-1.4"u8.ToArray(),
            "admin-upload.pdf",
            "application/pdf");

        var response = await client.PostAsync("/api/materials/upload", form);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Upload_ToInactiveInstrument_ReturnsForbidden()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");
        var updateResponse = await client.PutAsJsonAsync("/api/admin/instruments/1", new
        {
            name = "Piano",
            isActive = false,
        });
        updateResponse.EnsureSuccessStatusCode();

        client.DefaultRequestHeaders.Authorization = null;
        await SignIn(client, "teacher@test.local", "Teacher123!");
        using var form = CreateUploadForm(
            "Inactive Piano",
            1,
            "%PDF-1.4"u8.ToArray(),
            "inactive.pdf",
            "application/pdf");

        var response = await client.PostAsync("/api/materials/upload", form);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Upload_WithAbsoluteStorageRoot_CanBePreviewed()
    {
        var storageRoot = Path.Combine(Path.GetTempPath(), $"leybedik-storage-{Guid.NewGuid():N}");
        try
        {
            await using var factory = new TestApplicationFactory(storageRoot);
            await factory.SeedAsync();
            using var client = factory.CreateClient();
            await SignIn(client, "teacher@test.local", "Teacher123!");
            using var form = CreateUploadForm(
                "Absolute Storage",
                1,
                "%PDF-1.4"u8.ToArray(),
                "absolute.pdf",
                "application/pdf");

            var uploadResponse = await client.PostAsync("/api/materials/upload", form);

            uploadResponse.EnsureSuccessStatusCode();
            var material = await uploadResponse.Content.ReadFromJsonAsync<MaterialDto>();
            var previewResponse = await client.GetAsync($"/api/materials/{material!.Id}/preview");

            previewResponse.EnsureSuccessStatusCode();
            Assert.True(File.Exists(Directory.GetFiles(Path.Combine(storageRoot, "originals")).Single()));
        }
        finally
        {
            if (Directory.Exists(storageRoot))
                Directory.Delete(storageRoot, recursive: true);
        }
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
    public async Task Teacher_CannotDownloadOwnPendingMaterialThroughLibraryEndpoint()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        var response = await client.GetAsync("/api/materials/3/download");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Admin_CanDownloadPendingMaterialForReview()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var response = await client.GetAsync("/api/admin/materials/3/download");

        response.EnsureSuccessStatusCode();
        Assert.Equal("application/pdf", response.Content.Headers.ContentType?.MediaType);
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
    public async Task MaterialDetails_ReturnsPreviewableMaterialMetadata()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        var response = await client.GetAsync("/api/materials/1");

        response.EnsureSuccessStatusCode();
        var material = await response.Content.ReadFromJsonAsync<MaterialDto>();
        Assert.Equal("Assigned Approved", material!.Title);
        Assert.Equal("Piano", material.InstrumentName);
    }

    [Fact]
    public async Task LikingSameMaterialTwice_IncrementsOnlyOnce()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");
        using var form = CreateUploadForm(
            "Admin Likeable",
            1,
            "%PDF-1.4"u8.ToArray(),
            "admin-likeable.pdf",
            "application/pdf");
        var uploadResponse = await client.PostAsync("/api/materials/upload", form);
        uploadResponse.EnsureSuccessStatusCode();
        var uploaded = await uploadResponse.Content.ReadFromJsonAsync<MaterialDto>();
        var approveResponse = await client.PostAsync($"/api/admin/materials/{uploaded!.Id}/approve", null);
        approveResponse.EnsureSuccessStatusCode();

        client.DefaultRequestHeaders.Authorization = null;
        await SignIn(client, "teacher@test.local", "Teacher123!");

        var first = await client.PostAsync($"/api/materials/{uploaded.Id}/like", null);
        var second = await client.PostAsync($"/api/materials/{uploaded.Id}/like", null);

        first.EnsureSuccessStatusCode();
        second.EnsureSuccessStatusCode();

        var response = await client.GetAsync("/api/materials/approved");
        response.EnsureSuccessStatusCode();
        var materials = await response.Content.ReadFromJsonAsync<List<MaterialDto>>();
        var material = Assert.Single(materials!, m => m.Id == uploaded.Id);

        Assert.Equal(1, material.LikeCount);
        Assert.True(material.IsLikedByCurrentUser);
    }

    [Fact]
    public async Task Teacher_CannotLikeOwnMaterial()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        var response = await client.PostAsync("/api/materials/1/like", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
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
    public async Task Admin_CreateUserWithWhitespaceNameOrEmail_ReturnsBadRequest()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var blankNameResponse = await client.PostAsJsonAsync("/api/admin/users", new
        {
            fullName = "   ",
            email = "blank-name@test.local",
            password = "Teacher123!",
            role = "Teacher",
            isActive = true,
            instrumentIds = new[] { 1 },
        });
        var blankEmailResponse = await client.PostAsJsonAsync("/api/admin/users", new
        {
            fullName = "Blank Email",
            email = "   ",
            password = "Teacher123!",
            role = "Teacher",
            isActive = true,
            instrumentIds = new[] { 1 },
        });

        Assert.Equal(HttpStatusCode.BadRequest, blankNameResponse.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, blankEmailResponse.StatusCode);
    }

    [Fact]
    public async Task Admin_CreateUser_NormalizesEmail()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var response = await client.PostAsJsonAsync("/api/admin/users", new
        {
            fullName = "Normalized Teacher",
            email = "  MIXED.CASE@test.local  ",
            password = "Teacher123!",
            role = "Teacher",
            isActive = true,
            instrumentIds = new[] { 1 },
        });

        response.EnsureSuccessStatusCode();
        var created = await response.Content.ReadFromJsonAsync<AdminUserDto>();

        Assert.NotNull(created);
        Assert.Equal("mixed.case@test.local", created.Email);
    }

    [Fact]
    public async Task Admin_CreateUserWithShortPassword_ReturnsBadRequest()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var response = await client.PostAsJsonAsync("/api/admin/users", new
        {
            fullName = "Weak Password",
            email = "weak@test.local",
            password = "short",
            role = "Teacher",
            isActive = true,
            instrumentIds = new[] { 1 },
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Admin_CannotDeactivateOwnAccount()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var response = await client.PutAsJsonAsync("/api/admin/users/1", new
        {
            fullName = "Admin",
            email = "admin@test.local",
            role = "Admin",
            isActive = false,
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Admin_CannotDowngradeLastActiveAdmin()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var response = await client.PutAsJsonAsync("/api/admin/users/1", new
        {
            fullName = "Admin",
            email = "admin@test.local",
            role = "Teacher",
            isActive = true,
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Admin_ChangingTeacherToAdmin_ClearsInstrumentAssignments()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var updateResponse = await client.PutAsJsonAsync("/api/admin/users/2", new
        {
            fullName = "Teacher Admin",
            email = "teacher@test.local",
            role = "Admin",
            isActive = true,
        });
        var usersResponse = await client.GetAsync("/api/admin/users");

        updateResponse.EnsureSuccessStatusCode();
        usersResponse.EnsureSuccessStatusCode();
        var users = await usersResponse.Content.ReadFromJsonAsync<List<AdminUserDto>>();
        var updated = Assert.Single(users!, user => user.Id == 2);

        Assert.Equal("Admin", updated.Role);
        Assert.Empty(updated.Instruments);
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
    public async Task Admin_CreateOrUpdateInstrumentWithWhitespaceName_ReturnsBadRequest()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var createResponse = await client.PostAsJsonAsync("/api/admin/instruments", new
        {
            name = "   ",
            isActive = true,
        });
        var updateResponse = await client.PutAsJsonAsync("/api/admin/instruments/1", new
        {
            name = "   ",
            isActive = true,
        });

        Assert.Equal(HttpStatusCode.BadRequest, createResponse.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, updateResponse.StatusCode);
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
        var auditPaged = await auditResponse.Content.ReadFromJsonAsync<TestPagedResult<AuditLogDto>>();

        Assert.NotNull(auditPaged);
        Assert.Contains(auditPaged.Items, log => log.Action == "ApproveMaterial" && log.EntityId == 3);
    }

    [Fact]
    public async Task Admin_RejectMaterial_WritesAuditLogAndRemovesFromPending()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var rejectResponse = await client.PostAsJsonAsync("/api/admin/materials/3/reject", new
        {
            reason = "Needs clearer notation",
        });
        var pendingResponse = await client.GetAsync("/api/admin/materials/pending");
        var auditResponse = await client.GetAsync("/api/admin/audit-logs");

        rejectResponse.EnsureSuccessStatusCode();
        pendingResponse.EnsureSuccessStatusCode();
        auditResponse.EnsureSuccessStatusCode();
        var pending = await pendingResponse.Content.ReadFromJsonAsync<List<MaterialDto>>();
        var logsPaged = await auditResponse.Content.ReadFromJsonAsync<TestPagedResult<AuditLogDto>>();

        Assert.NotNull(pending);
        Assert.NotNull(logsPaged);
        Assert.DoesNotContain(pending, material => material.Id == 3);
        Assert.Contains(logsPaged.Items, log => log.Action == "RejectMaterial" && log.EntityId == 3);
        var rejected = await rejectResponse.Content.ReadFromJsonAsync<MaterialDto>();
        Assert.Equal("Needs clearer notation", rejected!.RejectionReason);
        Assert.NotNull(rejected.RejectedAtUtc);
    }

    [Fact]
    public async Task Admin_CanRestoreArchivedMaterial()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var deleteResponse = await client.DeleteAsync("/api/admin/materials/1");
        var archivedResponse = await client.GetAsync("/api/admin/materials/archived");
        var restoreResponse = await client.PostAsync("/api/admin/materials/1/restore", null);
        var materialsResponse = await client.GetAsync("/api/admin/materials");
        var auditResponse = await client.GetAsync("/api/admin/audit-logs");

        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
        archivedResponse.EnsureSuccessStatusCode();
        restoreResponse.EnsureSuccessStatusCode();
        materialsResponse.EnsureSuccessStatusCode();
        auditResponse.EnsureSuccessStatusCode();
        var archived = await archivedResponse.Content.ReadFromJsonAsync<TestPagedResult<MaterialDto>>();
        var materials = await materialsResponse.Content.ReadFromJsonAsync<TestPagedResult<MaterialDto>>();
        var logs = await auditResponse.Content.ReadFromJsonAsync<TestPagedResult<AuditLogDto>>();

        Assert.Contains(archived!.Items, material => material.Id == 1);
        Assert.Contains(materials!.Items, material => material.Id == 1);
        Assert.Contains(logs!.Items, log => log.Action == "RestoreMaterial" && log.EntityId == 1);
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
        var paged = await response.Content.ReadFromJsonAsync<TestPagedResult<MaterialDto>>();

        Assert.NotNull(paged);
        Assert.Single(paged.Items);
        Assert.Equal("Assigned Pending", paged.Items[0].Title);
    }

    [Fact]
    public async Task Admin_CanSoftDeleteAnyMaterial()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var deleteResponse = await client.DeleteAsync("/api/admin/materials/1");
        var materialsResponse = await client.GetAsync("/api/admin/materials");
        var auditResponse = await client.GetAsync("/api/admin/audit-logs");

        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
        materialsResponse.EnsureSuccessStatusCode();
        auditResponse.EnsureSuccessStatusCode();
        var materials = await materialsResponse.Content.ReadFromJsonAsync<TestPagedResult<MaterialDto>>();
        var logs = await auditResponse.Content.ReadFromJsonAsync<TestPagedResult<AuditLogDto>>();

        Assert.NotNull(materials);
        Assert.NotNull(logs);
        Assert.DoesNotContain(materials.Items, material => material.Id == 1);
        Assert.Contains(logs.Items, log => log.Action == "DeleteMaterialByAdmin" && log.EntityId == 1);
    }

    [Fact]
    public async Task Admin_CanPermanentlyDeleteArchivedMaterial()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.MaterialLikes.Add(new MaterialLike
            {
                MaterialId = 1,
                UserId = 2,
                CreatedAtUtc = new DateTime(2026, 1, 2, 12, 0, 0, DateTimeKind.Utc),
            });
            db.MaterialDownloads.Add(new MaterialDownload
            {
                MaterialId = 1,
                UserId = 2,
                DownloadedAtUtc = new DateTime(2026, 1, 2, 12, 0, 0, DateTimeKind.Utc),
            });
            await db.SaveChangesAsync();
        }

        var archiveResponse = await client.DeleteAsync("/api/admin/materials/1");
        var permanentDeleteResponse = await client.DeleteAsync("/api/admin/materials/1/permanent");
        var archivedResponse = await client.GetAsync("/api/admin/materials/archived");
        var auditResponse = await client.GetAsync("/api/admin/audit-logs");

        Assert.Equal(HttpStatusCode.NoContent, archiveResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, permanentDeleteResponse.StatusCode);
        archivedResponse.EnsureSuccessStatusCode();
        auditResponse.EnsureSuccessStatusCode();

        var archived = await archivedResponse.Content.ReadFromJsonAsync<TestPagedResult<MaterialDto>>();
        var logs = await auditResponse.Content.ReadFromJsonAsync<TestPagedResult<AuditLogDto>>();

        Assert.NotNull(archived);
        Assert.DoesNotContain(archived.Items, material => material.Id == 1);
        Assert.Contains(
            logs!.Items,
            log => log.Action == "PermanentDeleteMaterial"
                && log.EntityId == 1
                && log.Details!.Contains("מחיקה לצמיתות של חומר מהארכיון"));

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Null(await db.Materials.FirstOrDefaultAsync(material => material.Id == 1));
            Assert.Empty(await db.MaterialLikes.Where(like => like.MaterialId == 1).ToListAsync());
            Assert.Empty(await db.MaterialDownloads.Where(download => download.MaterialId == 1).ToListAsync());
        }
    }

    [Fact]
    public async Task Admin_CannotPermanentlyDeleteNonArchivedMaterial()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var permanentDeleteResponse = await client.DeleteAsync("/api/admin/materials/1/permanent");

        Assert.Equal(HttpStatusCode.Conflict, permanentDeleteResponse.StatusCode);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var material = await db.Materials.FirstOrDefaultAsync(m => m.Id == 1);
            Assert.NotNull(material);
            Assert.False(material!.IsDeleted);
        }
    }

    [Fact]
    public async Task Teacher_CannotPermanentlyDeleteArchivedMaterial()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var adminClient = factory.CreateClient();
        await SignIn(adminClient, "admin@test.local", "Admin123!");
        var archiveResponse = await adminClient.DeleteAsync("/api/admin/materials/1");
        Assert.Equal(HttpStatusCode.NoContent, archiveResponse.StatusCode);

        using var teacherClient = factory.CreateClient();
        await SignIn(teacherClient, "teacher@test.local", "Teacher123!");
        var permanentDeleteResponse = await teacherClient.DeleteAsync("/api/admin/materials/1/permanent");

        Assert.Equal(HttpStatusCode.Forbidden, permanentDeleteResponse.StatusCode);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var material = await db.Materials.FirstOrDefaultAsync(m => m.Id == 1);
            Assert.NotNull(material);
            Assert.True(material!.IsDeleted);
        }
    }

    [Fact]
    public async Task Anonymous_CannotPermanentlyDeleteArchivedMaterial()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var adminClient = factory.CreateClient();
        await SignIn(adminClient, "admin@test.local", "Admin123!");
        var archiveResponse = await adminClient.DeleteAsync("/api/admin/materials/1");
        Assert.Equal(HttpStatusCode.NoContent, archiveResponse.StatusCode);

        using var anonymousClient = factory.CreateClient();
        var permanentDeleteResponse = await anonymousClient.DeleteAsync("/api/admin/materials/1/permanent");

        Assert.Equal(HttpStatusCode.Unauthorized, permanentDeleteResponse.StatusCode);
    }

    [Fact]
    public async Task Teacher_CanSoftDeleteOwnPendingMaterial()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        var deleteResponse = await client.DeleteAsync("/api/materials/my-uploads/3");
        var uploadsResponse = await client.GetAsync("/api/materials/my-uploads");

        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
        uploadsResponse.EnsureSuccessStatusCode();
        var uploads = await uploadsResponse.Content.ReadFromJsonAsync<TestPagedResult<MaterialDto>>();

        Assert.NotNull(uploads);
        Assert.DoesNotContain(uploads.Items, material => material.Id == 3);
    }

    [Fact]
    public async Task Teacher_CannotSoftDeleteApprovedMaterial()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        var response = await client.DeleteAsync("/api/materials/my-uploads/1");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Teacher_CannotSoftDeleteSomeoneElsesMaterial()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");
        using var form = CreateUploadForm(
            "Admin Pending",
            1,
            "%PDF-1.4"u8.ToArray(),
            "admin-pending.pdf",
            "application/pdf");
        var uploadResponse = await client.PostAsync("/api/materials/upload", form);
        uploadResponse.EnsureSuccessStatusCode();
        var material = await uploadResponse.Content.ReadFromJsonAsync<MaterialDto>();

        client.DefaultRequestHeaders.Authorization = null;
        await SignIn(client, "teacher@test.local", "Teacher123!");
        var deleteResponse = await client.DeleteAsync($"/api/materials/my-uploads/{material!.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task ArchivedMaterial_IsHiddenFromRegularListsButAdminCanReview()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var deleteResponse = await client.DeleteAsync("/api/admin/materials/1");
        var materialsResponse = await client.GetAsync("/api/admin/materials");
        var adminPreviewResponse = await client.GetAsync("/api/materials/1/preview");
        var adminDownloadResponse = await client.GetAsync("/api/admin/materials/1/download");

        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
        materialsResponse.EnsureSuccessStatusCode();
        var materials = await materialsResponse.Content.ReadFromJsonAsync<TestPagedResult<MaterialDto>>();
        Assert.DoesNotContain(materials!.Items, material => material.Id == 1);
        Assert.Equal(HttpStatusCode.OK, adminPreviewResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, adminDownloadResponse.StatusCode);

        client.DefaultRequestHeaders.Authorization = null;
        await SignIn(client, "teacher@test.local", "Teacher123!");
        var teacherPreviewResponse = await client.GetAsync("/api/materials/1/preview");
        var teacherDownloadResponse = await client.GetAsync("/api/materials/1/download");

        Assert.Equal(HttpStatusCode.NotFound, teacherPreviewResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, teacherDownloadResponse.StatusCode);
    }

    [Fact]
    public async Task DemotedAdmin_CannotUseAdminEndpoints()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var originalAdminClient = factory.CreateClient();
        await SignIn(originalAdminClient, "admin@test.local", "Admin123!");

        using var setupClient = factory.CreateClient();
        await SignIn(setupClient, "admin@test.local", "Admin123!");
        var createResponse = await setupClient.PostAsJsonAsync("/api/admin/users", new
        {
            fullName = "Second Admin",
            email = "admin2@test.local",
            password = "Admin123!",
            role = "Admin",
            isActive = true,
            instrumentIds = Array.Empty<int>(),
        });
        createResponse.EnsureSuccessStatusCode();

        using var secondAdminClient = factory.CreateClient();
        await SignIn(secondAdminClient, "admin2@test.local", "Admin123!");
        await secondAdminClient.PutAsJsonAsync(
            "/api/admin/users/1",
            new { fullName = "Admin", email = "admin@test.local", role = "Teacher", isActive = true });

        var response = await originalAdminClient.GetAsync("/api/admin/materials");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Admin_CanUpdatePendingMaterialBeforeApproval()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");
        using var form = CreateUpdateForm(
            "Updated By Admin",
            2,
            "Advanced",
            "Updated description",
            "%PDF-1.4 replaced"u8.ToArray(),
            "replaced.pdf");

        var updateResponse = await client.PutAsync("/api/admin/materials/3", form);

        updateResponse.EnsureSuccessStatusCode();
        var updated = await updateResponse.Content.ReadFromJsonAsync<MaterialDto>();
        Assert.Equal("Updated By Admin", updated!.Title);
        Assert.Equal("Pending", updated.Status);
        Assert.Equal("Advanced", updated.Level);
        Assert.Equal("replaced.pdf", updated.FileName);
        Assert.NotNull(updated.FileSizeBytes);
        Assert.NotNull(updated.FileHashSha256);
    }

    [Fact]
    public async Task Admin_CanUpdateApprovedMaterial_KeepsApprovedStatus()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");
        using var form = CreateUpdateForm("Updated Approved Title", 1, "Advanced", "Updated description");

        var updateResponse = await client.PutAsync("/api/admin/materials/1", form);

        updateResponse.EnsureSuccessStatusCode();
        var updated = await updateResponse.Content.ReadFromJsonAsync<MaterialDto>();
        Assert.Equal("Updated Approved Title", updated!.Title);
        Assert.Equal("Approved", updated.Status);
        Assert.Equal("Advanced", updated.Level);
    }

    [Fact]
    public async Task Admin_EditApprovedMaterial_WritesAuditLog()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");
        using var form = CreateUpdateForm("Audit Approved Edit", 1);

        var updateResponse = await client.PutAsync("/api/admin/materials/1", form);
        updateResponse.EnsureSuccessStatusCode();

        var auditResponse = await client.GetAsync("/api/admin/audit-logs?page=1&pageSize=20");
        auditResponse.EnsureSuccessStatusCode();
        var logs = await auditResponse.Content.ReadFromJsonAsync<TestPagedResult<AuditLogDto>>();

        Assert.Contains(logs!.Items, log =>
            log.Action == "UpdateMaterialByAdmin" &&
            log.EntityId == 1 &&
            log.Details != null &&
            log.Details.Contains("Audit Approved Edit"));
    }

    [Fact]
    public async Task Teacher_CannotEditApprovedMaterialThroughAdminEndpoint()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");
        using var form = CreateUpdateForm("Should Fail", 1);

        var updateResponse = await client.PutAsync("/api/admin/materials/1", form);

        Assert.Equal(HttpStatusCode.Forbidden, updateResponse.StatusCode);
    }

    [Fact]
    public async Task Download_SecondDownloadBySameUser_DoesNotIncreaseCount()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        var firstDownload = await client.GetAsync("/api/materials/1/download");
        firstDownload.EnsureSuccessStatusCode();
        var secondDownload = await client.GetAsync("/api/materials/1/download");
        secondDownload.EnsureSuccessStatusCode();

        var materialsResponse = await client.GetAsync("/api/materials/approved");
        materialsResponse.EnsureSuccessStatusCode();
        var materials = await materialsResponse.Content.ReadFromJsonAsync<List<MaterialDto>>();
        var material = Assert.Single(materials!, item => item.Id == 1);

        Assert.Equal(1, material.DownloadCount);
    }

    [Fact]
    public async Task Download_ByAnotherTeacherUser_IncreasesUniqueCount()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");
        var createResponse = await client.PostAsJsonAsync("/api/admin/users", new
        {
            fullName = "Teacher Two",
            email = "teacher2@test.local",
            password = "Teacher123!",
            role = "Teacher",
            isActive = true,
            instrumentIds = new[] { 1 },
        });
        createResponse.EnsureSuccessStatusCode();

        client.DefaultRequestHeaders.Authorization = null;
        await SignIn(client, "teacher@test.local", "Teacher123!");
        var firstDownload = await client.GetAsync("/api/materials/1/download");
        firstDownload.EnsureSuccessStatusCode();

        client.DefaultRequestHeaders.Authorization = null;
        await SignIn(client, "teacher2@test.local", "Teacher123!");
        var secondDownload = await client.GetAsync("/api/materials/1/download");
        secondDownload.EnsureSuccessStatusCode();

        var materialsResponse = await client.GetAsync("/api/materials/approved");
        materialsResponse.EnsureSuccessStatusCode();
        var materials = await materialsResponse.Content.ReadFromJsonAsync<List<MaterialDto>>();
        var material = Assert.Single(materials!, item => item.Id == 1);

        Assert.Equal(2, material.DownloadCount);
    }

    [Fact]
    public async Task Admin_DownloadForReview_DoesNotIncreaseUniqueDownloadCount()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var downloadResponse = await client.GetAsync("/api/admin/materials/1/download");
        downloadResponse.EnsureSuccessStatusCode();

        var materialsResponse = await client.GetAsync("/api/admin/materials?status=Approved");
        materialsResponse.EnsureSuccessStatusCode();
        var paged = await materialsResponse.Content.ReadFromJsonAsync<TestPagedResult<MaterialDto>>();
        var material = Assert.Single(paged!.Items, item => item.Id == 1);

        Assert.Equal(0, material.DownloadCount);
    }

    [Fact]
    public async Task Teacher_GetWallet_ReturnsOnlyOwnMaterials()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        var walletResponse = await client.GetAsync("/api/materials/my-wallet");
        walletResponse.EnsureSuccessStatusCode();
        var wallet = await walletResponse.Content.ReadFromJsonAsync<TeacherWalletDto>();

        Assert.NotNull(wallet);
        Assert.Equal(3, wallet.TotalMaterials);
        Assert.All(wallet.Materials, item => Assert.Contains(item.Title, new[] { "Assigned Approved", "Unassigned Approved", "Assigned Pending" }));
    }

    [Fact]
    public async Task AdminUsers_ReturnsEngagementStatsForTeachers()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");
        var createResponse = await client.PostAsJsonAsync("/api/admin/users", new
        {
            fullName = "Teacher Two",
            email = "teacher2@test.local",
            password = "Teacher123!",
            role = "Teacher",
            isActive = true,
            instrumentIds = new[] { 1 },
        });
        createResponse.EnsureSuccessStatusCode();

        client.DefaultRequestHeaders.Authorization = null;
        await SignIn(client, "teacher2@test.local", "Teacher123!");
        await client.PostAsync("/api/materials/1/like", null);
        await client.GetAsync("/api/materials/1/download");

        client.DefaultRequestHeaders.Authorization = null;
        await SignIn(client, "admin@test.local", "Admin123!");
        var usersResponse = await client.GetAsync("/api/admin/users");
        usersResponse.EnsureSuccessStatusCode();
        var users = await usersResponse.Content.ReadFromJsonAsync<List<AdminUserDto>>();

        var teacher = Assert.Single(users!, user => user.Email == "teacher@test.local");
        var admin = Assert.Single(users, user => user.Email == "admin@test.local");

        Assert.Equal(1, teacher.TotalLikesReceived);
        Assert.Equal(1, teacher.TotalUniqueDownloadsReceived);
        Assert.Equal(0, admin.TotalLikesReceived);
        Assert.Equal(0, admin.TotalUniqueDownloadsReceived);
    }

    [Fact]
    public async Task AdminUsers_RoleFilter_ReturnsOnlyTeachers()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var response = await client.GetAsync("/api/admin/users?role=Teacher");
        response.EnsureSuccessStatusCode();
        var users = await response.Content.ReadFromJsonAsync<List<AdminUserDto>>();

        Assert.NotEmpty(users!);
        Assert.All(users, user => Assert.Equal("Teacher", user.Role));
    }

    [Fact]
    public async Task Teacher_CanUpdateOwnRejectedMaterialAndResubmitsAsPending()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");
        await client.PostAsJsonAsync("/api/admin/materials/3/reject", new { reason = "Needs work" });

        client.DefaultRequestHeaders.Authorization = null;
        await SignIn(client, "teacher@test.local", "Teacher123!");
        using var form = CreateUpdateForm("Updated Pending", 1, "Advanced", "Updated description");

        var updateResponse = await client.PutAsync("/api/materials/my-uploads/3", form);

        updateResponse.EnsureSuccessStatusCode();
        var updated = await updateResponse.Content.ReadFromJsonAsync<MaterialDto>();
        Assert.Equal("Updated Pending", updated!.Title);
        Assert.Equal("Pending", updated.Status);
        Assert.Equal("Advanced", updated.Level);
        Assert.Null(updated.RejectionReason);
        Assert.Null(updated.RejectedAtUtc);
    }

    [Fact]
    public async Task Teacher_CannotUpdateApprovedOrSomeoneElsesMaterial()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        using var approvedForm = CreateUpdateForm("Updated Approved", 1);
        using var otherForm = CreateUpdateForm("Updated Other", 1);
        var approvedResponse = await client.PutAsync("/api/materials/my-uploads/1", approvedForm);
        var otherResponse = await client.PutAsync("/api/materials/my-uploads/2", otherForm);

        Assert.Equal(HttpStatusCode.Forbidden, approvedResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, otherResponse.StatusCode);
    }

    [Fact]
    public async Task DisabledUser_CannotUseProtectedEndpoint()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();

        // Sign in while the account is active.
        await SignIn(client, "teacher@test.local", "Teacher123!");

        // Deactivate the account via admin.
        using var adminClient = factory.CreateClient();
        await SignIn(adminClient, "admin@test.local", "Admin123!");
        await adminClient.PutAsJsonAsync(
            "/api/admin/users/2",
            new { fullName = "Teacher", email = "teacher@test.local", role = "Teacher", isActive = false });

        // The teacher still has a valid JWT but must now be blocked.
        var response = await client.GetAsync("/api/materials/my-uploads");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AdminMaterials_PagedResult_ReturnsTotalCount()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "admin@test.local", "Admin123!");

        var response = await client.GetAsync("/api/admin/materials?page=1&pageSize=1");

        response.EnsureSuccessStatusCode();
        var paged = await response.Content.ReadFromJsonAsync<TestPagedResult<MaterialDto>>();

        Assert.NotNull(paged);
        Assert.Single(paged.Items);
        Assert.True(paged.TotalCount >= 1);
        Assert.Equal(1, paged.Page);
        Assert.Equal(1, paged.PageSize);
    }

    [Fact]
    public async Task MyUploads_PagedResult_ReturnsTotalCount()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        var response = await client.GetAsync("/api/materials/my-uploads?page=1&pageSize=1");

        response.EnsureSuccessStatusCode();
        var paged = await response.Content.ReadFromJsonAsync<TestPagedResult<MaterialDto>>();

        Assert.NotNull(paged);
        Assert.Single(paged.Items);
        Assert.True(paged.TotalCount >= 1);
    }

    [Fact]
    public async Task Upload_SetsFileSizeAndHashOnInitialUpload()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");
        var fileBytes = "%PDF-1.4 test content"u8.ToArray();
        using var form = CreateUploadForm("Hash Test", 1, fileBytes, "hash-test.pdf", "application/pdf");

        var uploadResponse = await client.PostAsync("/api/materials/upload", form);

        uploadResponse.EnsureSuccessStatusCode();
        var material = await uploadResponse.Content.ReadFromJsonAsync<MaterialDto>();
        Assert.NotNull(material!.FileSizeBytes);
        Assert.Equal(fileBytes.Length, material.FileSizeBytes);
        Assert.NotNull(material.FileHashSha256);
        Assert.Equal(64, material.FileHashSha256.Length);
    }

    [Fact]
    public async Task Update_WithNewFile_UpdatesFileSizeAndHash()
    {
        await using var factory = new TestApplicationFactory();
        await factory.SeedAsync();
        using var client = factory.CreateClient();
        await SignIn(client, "teacher@test.local", "Teacher123!");

        // Upload a first file so we have a known hash.
        var originalBytes = "%PDF-1.4 original"u8.ToArray();
        using var uploadForm = CreateUploadForm("Before Replace", 1, originalBytes, "before.pdf", "application/pdf");
        var uploadResponse = await client.PostAsync("/api/materials/upload", uploadForm);
        uploadResponse.EnsureSuccessStatusCode();
        var uploaded = await uploadResponse.Content.ReadFromJsonAsync<MaterialDto>();

        // Replace with a different file.
        var replacementBytes = "%PDF-1.4 replacement content xyz"u8.ToArray();
        using var updateForm = CreateUpdateForm(
            "After Replace", 1, "Beginner", null, replacementBytes, "after.pdf", "application/pdf");
        var updateResponse = await client.PutAsync($"/api/materials/my-uploads/{uploaded!.Id}", updateForm);

        updateResponse.EnsureSuccessStatusCode();
        var updated = await updateResponse.Content.ReadFromJsonAsync<MaterialDto>();
        Assert.NotNull(updated!.FileSizeBytes);
        Assert.Equal(replacementBytes.Length, updated.FileSizeBytes);
        Assert.NotNull(updated.FileHashSha256);
        Assert.NotEqual(uploaded.FileHashSha256, updated.FileHashSha256);
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

    private static MultipartFormDataContent CreateUploadForm(
        string title,
        int instrumentId,
        byte[] fileBytes,
        string fileName,
        string contentType,
        string? description = null,
        string level = "Beginner")
    {
        var form = new MultipartFormDataContent();
        form.Add(new StringContent(title), "title");
        if (description is not null)
            form.Add(new StringContent(description), "description");
        form.Add(new StringContent(instrumentId.ToString()), "instrumentId");
        form.Add(new StringContent(level), "level");
        form.Add(new StreamContent(new MemoryStream(fileBytes))
        {
            Headers = { ContentType = new MediaTypeHeaderValue(contentType) },
        }, "file", fileName);
        return form;
    }

    private static MultipartFormDataContent CreateUpdateForm(
        string title,
        int instrumentId,
        string level = "Beginner",
        string? description = null,
        byte[]? fileBytes = null,
        string fileName = "updated.pdf",
        string contentType = "application/pdf")
    {
        var form = new MultipartFormDataContent();
        form.Add(new StringContent(title), "title");
        if (description is not null)
            form.Add(new StringContent(description), "description");
        form.Add(new StringContent(instrumentId.ToString()), "instrumentId");
        form.Add(new StringContent(level), "level");
        if (fileBytes is not null)
        {
            form.Add(new StreamContent(new MemoryStream(fileBytes))
            {
                Headers = { ContentType = new MediaTypeHeaderValue(contentType) },
            }, "file", fileName);
        }

        return form;
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
