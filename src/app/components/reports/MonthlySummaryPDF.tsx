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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  summaryGrid: {
    flexDirection: "row",
    marginBottom: 20,
  },
  summaryItem: {
    flex: 1,
    padding: 10,
    border: 1,
    borderColor: "#ccc",
    marginRight: 10,
  },
  summaryLabel: {
    fontSize: 10,
    color: "#666",
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  table: {
    border: 1,
    borderColor: "#ccc",
    marginBottom: 20,
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
  },
});

interface MonthlySummaryPDFProps {
  monthName: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  statusCounts: {
    todo: number;
    inProgress: number;
    done: number;
    overdue: number;
  };
  priorityCounts: {
    low: number;
    medium: number;
    high: number;
  };
}

const MonthlySummaryPDF: React.FC<MonthlySummaryPDFProps> = ({
  monthName,
  totalTasks,
  completedTasks,
  overdueTasks,
  completionRate,
  statusCounts,
  priorityCounts,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Monthly Task Summary Report</Text>
      <Text style={{ fontSize: 16, textAlign: "center", marginBottom: 30 }}>
        {monthName}
      </Text>

      {/* Summary Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Tasks</Text>
            <Text style={styles.summaryValue}>{totalTasks}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Completed</Text>
            <Text style={styles.summaryValue}>{completedTasks}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Overdue</Text>
            <Text style={styles.summaryValue}>{overdueTasks}</Text>
          </View>
          <View style={[styles.summaryItem, { marginRight: 0 }]}>
            <Text style={styles.summaryLabel}>Completion Rate</Text>
            <Text style={styles.summaryValue}>
              {completionRate.toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Status Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tasks by Status</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCell}>Status</Text>
            <Text style={styles.tableCell}>Count</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>To Do</Text>
            <Text style={styles.tableCell}>{statusCounts.todo}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>In Progress</Text>
            <Text style={styles.tableCell}>{statusCounts.inProgress}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Done</Text>
            <Text style={styles.tableCell}>{statusCounts.done}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Overdue</Text>
            <Text style={styles.tableCell}>{statusCounts.overdue}</Text>
          </View>
        </View>
      </View>

      {/* Priority Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tasks by Priority</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCell}>Priority</Text>
            <Text style={styles.tableCell}>Count</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Low</Text>
            <Text style={styles.tableCell}>{priorityCounts.low}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Medium</Text>
            <Text style={styles.tableCell}>{priorityCounts.medium}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>High</Text>
            <Text style={styles.tableCell}>{priorityCounts.high}</Text>
          </View>
        </View>
      </View>
    </Page>
  </Document>
);

export default MonthlySummaryPDF;
