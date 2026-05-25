using System.Text;
using System.Text.Json.Serialization;
using LeybedikInfoKiosk.Server.Data;
using LeybedikInfoKiosk.Server.Middleware;
using LeybedikInfoKiosk.Server.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

ValidateProductionConfiguration(builder.Configuration, builder.Environment);

var defaultConnection = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(defaultConnection));

var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is not configured.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
    };
});
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
        new BadRequestObjectResult(new ProblemDetails
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Invalid request.",
            Detail = "One or more validation errors occurred.",
            Instance = context.HttpContext.Request.Path,
        });
});
builder.Services.AddScoped<JwtService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<InstrumentService>();
builder.Services.AddScoped<IFileStorageService>(sp =>
{
    var configuration = sp.GetRequiredService<IConfiguration>();
    var provider = configuration["Storage:Provider"] ?? "Local";
    return provider.Equals("S3", StringComparison.OrdinalIgnoreCase)
        ? ActivatorUtilities.CreateInstance<S3FileStorageService>(sp)
        : ActivatorUtilities.CreateInstance<LocalFileStorageService>(sp);
});
builder.Services.AddScoped<MaterialService>();
builder.Services.AddScoped<AuditLogService>();
builder.Services.AddScoped<DevelopmentDataSeeder>();
builder.Services.AddScoped<BootstrapAdminService>();
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy
                .SetIsOriginAllowed(origin =>
                {
                    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                        return false;

                    return uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
                           uri.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase);
                })
                .AllowAnyHeader()
                .AllowAnyMethod();
            return;
        }

        var allowedOrigins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>() ?? [];

        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod();
        }
    });
});

var app = builder.Build();

app.UseExceptionHandler(exceptionApp =>
{
    exceptionApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/problem+json";

        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "An unexpected error occurred.",
            Detail = "The server could not complete the request.",
            Instance = context.Request.Path,
        };
        problem.Extensions["traceId"] = context.TraceIdentifier;

        await context.Response.WriteAsJsonAsync(problem);
    });
});

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await scope.ServiceProvider.GetRequiredService<DevelopmentDataSeeder>().SeedAsync();
}
else
{
    using var scope = app.Services.CreateScope();
    var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();

    if (configuration.GetValue<bool>("Database:AutoMigrate"))
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();
    }

    await scope.ServiceProvider.GetRequiredService<BootstrapAdminService>().TryBootstrapAsync();
}

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseCors();
app.UseAuthentication();
app.UseMiddleware<ActiveUserMiddleware>();
app.UseAuthorization();
app.MapControllers();
app.MapFallback(async context =>
{
    if (context.Request.Path.StartsWithSegments("/api"))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }

    var indexPath = Path.Combine(app.Environment.WebRootPath ?? string.Empty, "index.html");
    if (!File.Exists(indexPath))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }

    context.Response.ContentType = "text/html";
    await context.Response.SendFileAsync(indexPath);
});

app.Run();

static void ValidateProductionConfiguration(IConfiguration configuration, IWebHostEnvironment environment)
{
    if (!environment.IsProduction())
        return;

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
        throw new InvalidOperationException("ConnectionStrings:DefaultConnection must be configured in production.");

    if (connectionString.Contains("(localdb)", StringComparison.OrdinalIgnoreCase) ||
        connectionString.Contains("localhost", StringComparison.OrdinalIgnoreCase) ||
        connectionString.Contains("127.0.0.1", StringComparison.OrdinalIgnoreCase))
    {
        throw new InvalidOperationException("Production database connection must not use localdb or localhost.");
    }

    var jwtSecret = configuration["Jwt:Secret"];
    if (string.IsNullOrWhiteSpace(jwtSecret) ||
        jwtSecret.Length < 32 ||
        jwtSecret.StartsWith("dev-only", StringComparison.OrdinalIgnoreCase))
    {
        throw new InvalidOperationException(
            "Jwt:Secret must be configured with a production secret of at least 32 characters.");
    }

    if (string.IsNullOrWhiteSpace(configuration["Jwt:Issuer"]))
        throw new InvalidOperationException("Jwt:Issuer must be configured in production.");

    if (string.IsNullOrWhiteSpace(configuration["Jwt:Audience"]))
        throw new InvalidOperationException("Jwt:Audience must be configured in production.");

    var storageProvider = configuration["Storage:Provider"] ?? "Local";
    if (storageProvider.Equals("Local", StringComparison.OrdinalIgnoreCase))
    {
        var storageRootPath = configuration["Storage:RootPath"];
        if (string.IsNullOrWhiteSpace(storageRootPath) ||
            !Path.IsPathRooted(storageRootPath) ||
            IsPathInside(storageRootPath, environment.ContentRootPath))
        {
            throw new InvalidOperationException(
                "Storage:RootPath must be an absolute path outside the application folder when using local storage in production.");
        }
    }
    else if (storageProvider.Equals("S3", StringComparison.OrdinalIgnoreCase))
    {
        RequireConfiguration(configuration, "Storage:S3:Endpoint");
        RequireConfiguration(configuration, "Storage:S3:Bucket");
        RequireConfiguration(configuration, "Storage:S3:AccessKey");
        RequireConfiguration(configuration, "Storage:S3:SecretKey");
    }
    else
    {
        throw new InvalidOperationException("Storage:Provider must be either Local or S3.");
    }

    var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
    foreach (var origin in allowedOrigins.Where(origin => !string.IsNullOrWhiteSpace(origin)))
    {
        if (origin == "*")
            throw new InvalidOperationException("Production CORS origins must not use '*'.");

        if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            throw new InvalidOperationException("Cors:AllowedOrigins must contain only valid HTTP/HTTPS origins.");
        }

        if (uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
            uri.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Production CORS origins must not use localhost.");
        }
    }
}

static void RequireConfiguration(IConfiguration configuration, string key)
{
    if (string.IsNullOrWhiteSpace(configuration[key]))
        throw new InvalidOperationException($"{key} must be configured in production.");
}

static bool IsPathInside(string candidatePath, string parentPath)
{
    var candidate = Path.GetFullPath(candidatePath).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
    var parent = Path.GetFullPath(parentPath).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);

    return candidate.Equals(parent, StringComparison.OrdinalIgnoreCase) ||
           candidate.StartsWith(parent + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) ||
           candidate.StartsWith(parent + Path.AltDirectorySeparatorChar, StringComparison.OrdinalIgnoreCase);
}

public partial class Program
{
}
