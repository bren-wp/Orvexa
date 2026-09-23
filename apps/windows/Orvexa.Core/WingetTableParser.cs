using System.Text.RegularExpressions;
namespace Orvexa.Core;

public static class WingetTableParser
{
    public static IReadOnlyList<string[]> ParseRows(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return [];
        var lines = text.Split(['\r','\n'], StringSplitOptions.RemoveEmptyEntries);
        var separatorIndex = Array.FindIndex(lines, line =>
            Regex.Matches(line, "-{2,}").Count >= 2);

        if (separatorIndex < 0) return [];

        var matches = Regex.Matches(lines[separatorIndex], "-{2,}");
        var starts = matches.Select(m => m.Index).ToArray();
        if (starts.Length < 2) return [];

        var rows = new List<string[]>();
        foreach (var line in lines.Skip(separatorIndex + 1))
        {
            if (string.IsNullOrWhiteSpace(line)) continue;
            var cells = new string[starts.Length];
            for (var i = 0; i < starts.Length; i++)
            {
                var start = starts[i];
                if (start >= line.Length) { cells[i] = ""; continue; }
                var end = i + 1 < starts.Length ? Math.Min(starts[i + 1], line.Length) : line.Length;
                cells[i] = line[start..end].Trim();
            }
            rows.Add(cells);
        }
        return rows;
    }
}