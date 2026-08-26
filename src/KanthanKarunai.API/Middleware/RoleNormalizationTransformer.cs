using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;

namespace KanthanKarunai.API.Middleware;

/// <summary>
/// Normalizes JWT role claims to PascalCase so that old tokens with
/// "ADMIN", "admin", "STAFF", etc. all match [Authorize(Roles = "Admin")].
/// This runs AFTER JWT validation, BEFORE authorization.
/// </summary>
public class RoleNormalizationTransformer : IClaimsTransformation
{
    public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        var identity = (principal.Identity as ClaimsIdentity);
        if (identity == null || !identity.IsAuthenticated)
            return Task.FromResult(principal);

        // Find all role claims and normalize them
        var roleClaims = identity.FindAll(ClaimTypes.Role).ToList();
        foreach (var claim in roleClaims)
        {
            var normalized = NormalizeRole(claim.Value);
            if (normalized != claim.Value)
            {
                identity.RemoveClaim(claim);
                identity.AddClaim(new Claim(ClaimTypes.Role, normalized, claim.ValueType, claim.Issuer));
            }
        }

        return Task.FromResult(principal);
    }

    private static string NormalizeRole(string role) => role?.ToUpperInvariant() switch
    {
        "ADMIN"    => "Admin",
        "STAFF"    => "Staff",
        "CUSTOMER" => "Customer",
        "DRIVER"   => "Driver",
        _          => role ?? string.Empty
    };
}
