import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  table: {
    border: 1,
    borderColor: "#ccc",
    marginTop: 20,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableHeader: {
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
  },
  tableCell: {
    flex: 1,
    padding: 8,
    borderRight: 1,
    borderRightColor: "#ccc",
    minWidth: 80,
  },
  nameCell: {
    flex: 2,
    padding: 8,
    borderRight: 1,
    borderRightColor: "#ccc",
    minWidth: 120,
  },
});

interface MemberStats {
  name: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  overdueTasks: number;
}

interface TeamPerformancePDFProps {
  monthName: string;
  memberStats: MemberStats[];
}

const TeamPerformancePDF: React.FC<TeamPerformancePDFProps> = ({
  monthName,
  memberStats,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Team Performance Report</Text>
      <Text style={{ fontSize: 16, textAlign: "center", marginBottom: 30 }}>
        {monthName}
      </Text>

      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={styles.nameCell}>Team Member</Text>
          <Text style={styles.tableCell}>Total Tasks</Text>
          <Text style={styles.tableCell}>Completed</Text>
          <Text style={styles.tableCell}>Completion %</Text>
          <Text style={styles.tableCell}>Overdue</Text>
        </View>
        {memberStats.map((member, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.nameCell}>{member.name}</Text>
            <Text style={styles.tableCell}>{member.totalTasks}</Text>
            <Text style={styles.tableCell}>{member.completedTasks}</Text>
            <Text style={styles.tableCell}>{member.completionRate}%</Text>
            <Text style={styles.tableCell}>{member.overdueTasks}</Text>
          </View>
        ))}
      </View>
    </Page>
  </Document>
);

export default TeamPerformancePDF;
