// src/components/PDFReportDocument.tsx
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { ProcessedStudent, SchoolSettings } from "../types";

// 1. STYLES (The CSS replacement)
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica", // Standard PDF font
    fontSize: 11,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#112233",
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  schoolName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e3a8a", // Blue-900
    textTransform: "uppercase",
  },
  subHeader: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
  },
  // Table Styles
  table: {
    display: "flex",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginTop: 20,
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row",
  },
  tableCol: {
    width: "25%", // Default column width
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCell: {
    margin: 5,
    fontSize: 10,
  },
  gradeBadge: {
    fontSize: 9,
    fontWeight: "bold",
  },
});

interface Props {
  student: ProcessedStudent;
  settings: SchoolSettings;
}

// 2. THE COMPONENT
export function PDFReportDocument({ student, settings }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <View>
            <Text style={styles.schoolName}>{settings.name || "SCHOOL NAME"}</Text>
            <Text style={styles.subHeader}>{settings.address || "Location Address"}</Text>
            <Text style={styles.subHeader}>{settings.email || "school@email.com"}</Text>
          </View>
          {/* We can add a logo Image here later */}
        </View>

        {/* STUDENT DETAILS */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: "bold" }}>TERM REPORT</Text>
          <View style={{ flexDirection: "row", marginTop: 10, gap: 50 }}>
            <View>
              <Text style={{ color: "#666", fontSize: 9 }}>Student Name</Text>
              <Text style={{ fontWeight: "bold" }}>{student.name}</Text>
            </View>
            <View>
              <Text style={{ color: "#666", fontSize: 9 }}>Class</Text>
              <Text style={{ fontWeight: "bold" }}>{student.className}</Text>
            </View>
            <View>
              <Text style={{ color: "#666", fontSize: 9 }}>ID</Text>
              <Text style={{ fontWeight: "bold" }}>{student.id.slice(0, 8)}</Text>
            </View>
          </View>
        </View>

        {/* ACADEMIC TABLE */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.tableRow, { backgroundColor: "#f3f4f6" }]}>
            <View style={[styles.tableCol, { width: "40%" }]}>
              <Text style={[styles.tableCell, { fontWeight: "bold" }]}>Subject</Text>
            </View>
            <View style={[styles.tableCol, { width: "15%" }]}>
              <Text style={[styles.tableCell, { fontWeight: "bold" }]}>Class</Text>
            </View>
            <View style={[styles.tableCol, { width: "15%" }]}>
              <Text style={[styles.tableCell, { fontWeight: "bold" }]}>Exam</Text>
            </View>
            <View style={[styles.tableCol, { width: "15%" }]}>
              <Text style={[styles.tableCell, { fontWeight: "bold" }]}>Total</Text>
            </View>
            <View style={[styles.tableCol, { width: "15%" }]}>
              <Text style={[styles.tableCell, { fontWeight: "bold" }]}>Grade</Text>
            </View>
          </View>

          {/* Table Rows */}
          {student.subjects.map((sub) => (
            <View style={styles.tableRow} key={sub.id}>
              <View style={[styles.tableCol, { width: "40%" }]}>
                <Text style={styles.tableCell}>{sub.name}</Text>
              </View>
              <View style={[styles.tableCol, { width: "15%" }]}>
                <Text style={styles.tableCell}>{sub.classScore}</Text>
              </View>
              <View style={[styles.tableCol, { width: "15%" }]}>
                <Text style={styles.tableCell}>{sub.examScore}</Text>
              </View>
              <View style={[styles.tableCol, { width: "15%" }]}>
                <Text style={styles.tableCell}>{sub.totalScore}</Text>
              </View>
              <View style={[styles.tableCol, { width: "15%" }]}>
                <Text style={styles.tableCell}>{sub.grade}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* SUMMARY SECTION */}
        <View style={{ marginTop: 20, borderTopWidth: 1, borderColor: "#eee", paddingTop: 10 }}>
          <Text>Position: {student.classPosition}</Text>
          <Text>Average Score: {student.averageScore}%</Text>
        </View>
      </Page>
    </Document>
  );
}
