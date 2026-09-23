namespace Orvexa.Core;
public sealed record QueueItem(string PackageId,bool Upgrade=false);
public sealed record QueueResult(string PackageId,bool Success,string Detail);
public sealed class QueueService {
 readonly WingetService winget;
 public QueueService(WingetService winget)=>this.winget=winget;
 public async Task<IReadOnlyList<QueueResult>> RunAsync(IEnumerable<QueueItem> items,IProgress<(int Done,int Total,string Id)>? progress=null,CancellationToken ct=default){
  var queue=items.GroupBy(x=>x.PackageId,StringComparer.OrdinalIgnoreCase).Select(x=>x.First()).Take(100).ToArray();
  var results=new List<QueueResult>();int done=0;
  foreach(var item in queue){ct.ThrowIfCancellationRequested();try{var r=await winget.InstallAsync(item.PackageId,item.Upgrade,ct);results.Add(new(item.PackageId,r.Code==0,r.Code==0?r.Output:r.Error));}catch(OperationCanceledException){throw;}catch(Exception ex){results.Add(new(item.PackageId,false,LogSanitizer.Clean(ex.Message)));}finally{progress?.Report((++done,queue.Length,item.PackageId));}}
  return results;
 }
}