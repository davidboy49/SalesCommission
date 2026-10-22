namespace SalesCommission.Domain.Calculation;

public static class Money
{
    public static decimal Convert(decimal amount, Currency from, Currency to, decimal khrPerUsd)
    {
        if (from == to)
            return amount;
        return from == Currency.USD ? amount * khrPerUsd : amount / khrPerUsd;
    }

    /// <summary>USD to the cent; KHR to the nearest 100 riel (smallest note in common use).</summary>
    public static decimal RoundPayout(decimal amount, Currency currency) => currency switch
    {
        Currency.KHR => Math.Round(amount / 100m, 0, MidpointRounding.AwayFromZero) * 100m,
        _ => Math.Round(amount, 2, MidpointRounding.AwayFromZero)
    };
}
