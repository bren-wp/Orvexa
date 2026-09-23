namespace Orvexa.Core;
public sealed class WingetService {
 public async Task<IReadOnlyList<PackageItem>> SearchAsync(string query,int limit=100,CancellationToken ct=default){
  query=PackagePolicy.NormalizeQuery(query); if(query.Length<2)return [];
  limit=Math.Clamp(limit,1,500);
  var r=await ProcessRunner.RunAsync("winget.exe",["search",query,"--count",limit.ToString(),"--accept-source-agreements","--disable-interactivity"],TimeSpan.FromSeconds(20),ct);
  return Parse(r.Output).Take(limit).ToArray();
 }
 public Task<(int Code,string Output,string Error)> InstallAsync(string id,bool upgrade=false,CancellationToken ct=default){
  ValidateId(id);
  var verb=upgrade?"upgrade":"install";
  return ProcessRunner.RunAsync("winget.exe",[verb,"--id",id,"--exact","--accept-package-agreements","--accept-source-agreements","--disable-interactivity"],TimeSpan.FromMinutes(20),ct);
 }
 public Task<(int Code,string Output,string Error)> UninstallAsync(string id,CancellationToken ct=default){
  ValidateId(id);return ProcessRunner.RunAsync("winget.exe",["uninstall","--id",id,"--exact","--disable-interactivity"],TimeSpan.FromMinutes(15),ct);
 }
 public Task<(int Code,string Output,string Error)> UpdateAllAsync(CancellationToken ct=default)=>
  ProcessRunner.RunAsync("winget.exe",["upgrade","--all","--accept-package-agreements","--accept-source-agreements","--disable-interactivity"],TimeSpan.FromMinutes(60),ct);
 static void ValidateId(string id){if(!PackagePolicy.IsSafeId(id))throw new ArgumentException("Invalid package id");}
 public async Task<IReadOnlyList<PackageItem>> SearchManyAsync(IEnumerable<string> queries,int perQuery=200,CancellationToken ct=default){
  var all=new List<PackageItem>();
  foreach(var q in queries.Where(x=>!string.IsNullOrWhiteSpace(x)).Distinct(StringComparer.OrdinalIgnoreCase).Take(64)){ct.ThrowIfCancellationRequested();all.AddRange(await SearchAsync(q,perQuery,ct));}
  return all.GroupBy(x=>x.Id,StringComparer.OrdinalIgnoreCase).Select(x=>x.First()).OrderBy(x=>x.Name,StringComparer.OrdinalIgnoreCase).ToArray();
 }
 static IEnumerable<PackageItem> Parse(string text)
 {
  foreach(var row in WingetTableParser.ParseRows(text))
  {
   if(row.Length<2 || !PackagePolicy.IsSafeId(row[1])) continue;
   yield return new PackageItem(row[0],row[1],row.Length>2?row[2]:"");
  }
 }
}