import AppLayout from "../../Components/Layout/AppLayout";
import "./CallsList.scss";
import { CallFilter } from "../../Components/CallList/callFilter";
import { CallTable } from "../../Components/CallList/CallTable";
import { CallActions } from "../../Components/CallList/CallActions";
import { useCallList } from "../../Hooks/Calls/useCallList";

function CallsList() {
  const { 
    calls, 
    loading, 
    error, 
    currentPage, 
    totalPages,
    filters,
    handleFilterChange,
    handlePageChange,
    openModal,
    handleDeleteCall, 
    handleDeletePage, 
    handleExportCalls,
    formatDate,
    getStatusBadge,
    deleting,
    deletingPage,
    loadCalls
  } = useCallList();

  return (
    <AppLayout>
      <div className="calls-list-container">
        <CallFilter 
          filters={filters}
          handleFilterChange={handleFilterChange}
          loadCalls={loadCalls}
          currentPage={currentPage}
        />

        <CallTable
          calls={calls}
          loading={loading}
          error={error}
          onViewCall={openModal}
          onDeleteCall={handleDeleteCall}
          deleting={deleting}
          formatDate={formatDate}
          getStatusBadge={getStatusBadge}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />

        <CallActions
          calls={calls}
          onExportCalls={handleExportCalls}
          onDeletePage={handleDeletePage}
          deletingPage={deletingPage}
        />
      </div>

    </AppLayout>
  );
}

export default CallsList;
