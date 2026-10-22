using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using SalesCommission.Api.Services;
using SalesCommission.Infrastructure.Persistence;

namespace SalesCommission.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(UserManager<AppUser> users, TokenService tokens) : ControllerBase
{
    public record LoginRequest(string Email, string Password);
    public record LoginResponse(string Token, DateTime ExpiresUtc, string DisplayName, string Email, string[] Roles, int? EmployeeId);

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        var user = await users.FindByEmailAsync(request.Email);
        if (user is null || !await users.CheckPasswordAsync(user, request.Password))
        {
            // Count the failure so repeated guessing locks the account.
            if (user is not null)
                await users.AccessFailedAsync(user);
            return Unauthorized(new { message = "Invalid email or password." });
        }
        if (await users.IsLockedOutAsync(user))
            return Unauthorized(new { message = "Account is temporarily locked. Try again later." });

        await users.ResetAccessFailedCountAsync(user);
        var roles = (await users.GetRolesAsync(user)).ToArray();
        var (token, expires) = tokens.Create(user, roles);
        return new LoginResponse(token, expires, user.DisplayName, user.Email!, roles, user.EmployeeId);
    }
}
