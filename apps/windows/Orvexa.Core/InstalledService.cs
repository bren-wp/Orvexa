namespace Orvexa.Core;
public sealed record InstalledPackage(string Name,string Id,string Version,string? AvailableVersion=null)
{
    public string VersionDisplay=>
        string.IsNullOrWhiteSpace(AvailableVersion)
            ? Version
            : $"{Version} to {AvailableVersion}";
}

public sealed class InstalledService
{
    public async Task<IReadOnlyList<InstalledPackage>> GetInstalledAsync(CancellationToken ct=default)
    {
        var r=await ProcessRunner.RunAsync("winget.exe",
            ["list","--accept-source-agreements","--disable-interactivity"],
            TimeSpan.FromSeconds(30),ct);

        return WingetTableParser.ParseRows(r.Output)
            .Where(x=>x.Length>=3 && PackagePolicy.IsSafeId(x[1]))
            .Select(x=>new InstalledPackage(
                x[0],x[1],x[2],
                x.Length>=5 && !string.IsNullOrWhiteSpace(x[3]) ? x[3] : null))
            .ToArray();
    }
}