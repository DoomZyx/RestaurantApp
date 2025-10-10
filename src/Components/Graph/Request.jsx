import { fetchCalls } from "../../API/Calls/api";
import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#00ff00", "#0088FE", "#FF8042"];

export default function RequestStatus() {
  const [demandesData, setDemandesData] = useState([]);

  useEffect(() => {
    async function fetchDemandes() {
      try {
        const json = await fetchCalls();
        console.log("données: ", json);

        const nouveau = json.data.filter(
          (demande) => demande.statut === "nouveau"
        );

        const traitees = json.data.filter(
          (demande) => demande.statut === "termine"
        );
        const enCours = json.data.filter(
          (demande) => demande.statut === "en cours"
        );

        setDemandesData([
          { name: "Traitée(s)", value: traitees.length },
          { name: "Nouveau", value: nouveau.length },
          { name: "En cours", value: enCours.length },
        ]);
      } catch (error) {
        console.error("Erreur API demandes:", error);
      }
    }

    fetchDemandes();
  }, []);

  return (
    <div style={{ width: "100%", height: 350 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={demandesData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={120}
            label={false}
          >
            {demandesData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
