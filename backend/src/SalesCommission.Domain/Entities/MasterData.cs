namespace SalesCommission.Domain.Entities;

public class Region
{
    public int Id { get; set; }
    public required string Code { get; set; }
    public required string Name { get; set; }
}

public class Channel
{
    public int Id { get; set; }
    public required string Code { get; set; }
    public required string Name { get; set; }
}

/// <summary>Brand or product family, used for focus-brand KPIs.</summary>
public class ProductGroup
{
    public int Id { get; set; }
    public required string Code { get; set; }
    public required string Name { get; set; }
}

public class Product
{
    public int Id { get; set; }
    public required string Sku { get; set; }
    public required string Name { get; set; }
    public int ProductGroupId { get; set; }
    public ProductGroup? ProductGroup { get; set; }
    public int UnitsPerCase { get; set; }
    public decimal PricePerCaseUsd { get; set; }
    public bool IsActive { get; set; } = true;
}

public class Employee
{
    public int Id { get; set; }
    public required string Code { get; set; }
    public required string FullName { get; set; }
    public SalesRole Role { get; set; }
    public int RegionId { get; set; }
    public Region? Region { get; set; }
    /// <summary>Primary channel the employee sells to; used to pick channel-specific plans.</summary>
    public int? ChannelId { get; set; }
    public Channel? Channel { get; set; }
    /// <summary>Direct supervisor / manager in the sales hierarchy.</summary>
    public int? ManagerId { get; set; }
    public Employee? Manager { get; set; }
    public string? Phone { get; set; }
    public DateOnly HireDate { get; set; }
    public bool IsActive { get; set; } = true;
}

public class Outlet
{
    public int Id { get; set; }
    public required string Code { get; set; }
    public required string Name { get; set; }
    public int ChannelId { get; set; }
    public Channel? Channel { get; set; }
    public int RegionId { get; set; }
    public Region? Region { get; set; }
    public int? AssignedEmployeeId { get; set; }
    public Employee? AssignedEmployee { get; set; }
    public DateOnly OpenedOn { get; set; }
}
