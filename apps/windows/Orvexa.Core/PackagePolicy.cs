using System.Text.RegularExpressions;

namespace Orvexa.Core;

public static class PackagePolicy
{
    static readonly Regex SafePackageId = new(
        @"^[A-Za-z0-9][A-Za-z0-9._+-]+$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public static bool IsSafeId(string? id) =>
        !string.IsNullOrWhiteSpace(id) &&
        id.Length <= 200 &&
        SafePackageId.IsMatch(id);

    public static string NormalizeQuery(string? value)
    {
        var query = (value ?? "").Trim();
        if (query.Length > 120) query = query[..120];
        return new string(query.Where(c => !char.IsControl(c)).ToArray());
    }
}
