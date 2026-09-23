namespace Orvexa.Core;
public sealed record PackageItem(string Name,string Id,string Version="",string Source="winget");
public sealed record DeviceProfile(string Manufacturer,string Model,string Windows,string Architecture,string Group);
public sealed record UpdateSummary(int Count,IReadOnlyList<PackageItem> Updates);
