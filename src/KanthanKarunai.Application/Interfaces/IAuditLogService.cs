using System.Threading.Tasks;

namespace KanthanKarunai.Application.Interfaces;

public interface IAuditLogService
{
    Task LogAsync(string action, string tableName, string recordId, object? oldValue, object? newValue);
}
