import CallsPerDay from "../callsPerDay";
import "./layoutGraph.scss";

function Graphs() {
  return (
    <>
      <div className="layout-callsgraph">
        <div className="callsgraph-container">
          <div className="graph-title">
            <h3>
              <i className="bi bi-graph-up-arrow"></i> Évolution Quotidienne
            </h3>
          </div>
          <CallsPerDay />
        </div>
      </div>
    </>
  );
}

export default Graphs;
