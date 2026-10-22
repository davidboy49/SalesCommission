using Microsoft.AspNetCore.Identity;

namespace SalesCommission.Infrastructure.Persistence;

public class AppUser : IdentityUser
{
    public string DisplayName { get; set; } = "";
    /// <summary>Links a login to an employee; reps and supervisors only see data for this employee (and their team).</summary>
    public int? EmployeeId { get; set; }
}

public static class Roles
{
    public const string Admin = "Admin";
    public const string Finance = "Finance";
    public const string Manager = "Manager";
    public const string Supervisor = "Supervisor";
    public const string Rep = "Rep";

    public static readonly string[] All = [Admin, Finance, Manager, Supervisor, Rep];
    /// <summary>Roles that can run calculations and see everyone's results.</summary>
    public const string Office = $"{Admin},{Finance}";
}
