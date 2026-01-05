// src/components/PDFReportDocument.tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ProcessedStudent, SchoolSettings } from "../types";
import { generateHeadmasterRemark } from "../utils/remarkGenerator";

// ==========================================
// 1. STYLES (Optimized for A4 Single Page)
// ==========================================
const styles = StyleSheet.create({
  page: {
    padding: 20, // Tighter padding to fit more content
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1f2937",
  },
  // HEADER
  header: {
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#1e3a8a",
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  schoolName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e3a8a",
    textTransform: "uppercase",
  },
  schoolDetails: {
    fontSize: 8,
    color: "#666",
    marginTop: 2,
  },

  // STUDENT INFO GRID
  infoGrid: {
    flexDirection: "row",
    marginBottom: 15,
    backgroundColor: "#f1f5f9",
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  infoCol: {
    flex: 1,
  },
  label: {
    fontSize: 7,
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: "bold",
    marginBottom: 2,
  },
  value: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#000",
  },

  // ACADEMIC TABLE
  table: {
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 15,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomColor: "#cbd5e1",
    borderBottomWidth: 1,
    alignItems: "center",
    height: 20, // Compact row height
  },
  tableHeader: {
    backgroundColor: "#e2e8f0",
    height: 24,
  },
  tableCol: {
    borderRightColor: "#cbd5e1",
    borderRightWidth: 1,
    paddingLeft: 4,
    justifyContent: "center",
  },
  tableCell: {
    fontSize: 8,
  },
  remarkCell: {
    fontSize: 7,
    fontStyle: "italic",
  },

  // SECTION B
  sectionB: {
    marginTop: 5,
    borderTopWidth: 2,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
  },
  boxRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  box: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 6,
    borderRadius: 2,
  },
  remarkBlock: {
    marginBottom: 10,
  },
  remarkTitle: {
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 2,
    color: "#475569",
  },
  remarkText: {
    fontSize: 9,
    fontStyle: "italic",
    padding: 6,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minHeight: 30,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    paddingHorizontal: 20,
  },
  signatureLine: {
    width: "40%",
    borderTopWidth: 1,
    borderTopColor: "#000",
    paddingTop: 5,
    textAlign: "center",
    fontSize: 8,
    color: "#666",
  },
});

interface Props {
  student: ProcessedStudent;
  settings: SchoolSettings;
}

export function PDFReportDocument({ student, settings }: Props) {
  // Generate Headmaster Remark on the fly
  const headmasterRemark = generateHeadmasterRemark(student.averageScore, settings.term);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* --- HEADER --- */}
        <View style={styles.header}>
          <View>
            <Text style={styles.schoolName}>{settings.name || "GHANA EDUCATION SERVICE"}</Text>
            <Text style={styles.schoolDetails}>{settings.address || "Address Not Set"}</Text>
            <Text style={styles.schoolDetails}>
              {settings.email || ""} {settings.email ? "|" : ""} {settings.academicYear}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: "#64748b" }}>TERM REPORT</Text>
            <Text style={[styles.schoolDetails, { fontWeight: "bold", color: "#000" }]}>
              {settings.term}
            </Text>
          </View>
        </View>

        {/* --- STUDENT DETAILS (No Student ID) --- */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.label}>Name of Student</Text>
            <Text style={styles.value}>{student.name}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.label}>Class</Text>
            <Text style={styles.value}>{student.className}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.label}>Position</Text>
            <Text style={styles.value}>{student.classPosition || "-"}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.label}>No. on Roll</Text>
            <Text style={styles.value}>35</Text> {/* Hardcoded for v0.1 */}
          </View>
        </View>

        {/* --- ACADEMIC TABLE (Swapped Grade for Remark) --- */}
        <View style={styles.table}>
          {/* Header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={[styles.tableCol, { width: "40%" }]}>
              <Text style={[styles.tableCell, { fontWeight: "bold" }]}>Subject</Text>
            </View>
            <View style={[styles.tableCol, { width: "15%" }]}>
              <Text style={[styles.tableCell, { fontWeight: "bold" }]}>Class (30)</Text>
            </View>
            <View style={[styles.tableCol, { width: "15%" }]}>
              <Text style={[styles.tableCell, { fontWeight: "bold" }]}>Exam (70)</Text>
            </View>
            <View style={[styles.tableCol, { width: "10%" }]}>
              <Text style={[styles.tableCell, { fontWeight: "bold" }]}>Total</Text>
            </View>
            <View style={[styles.tableCol, { width: "20%", borderRightWidth: 0 }]}>
              <Text style={[styles.tableCell, { fontWeight: "bold" }]}>Remark</Text>
            </View>
          </View>

          {/* Rows */}
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
              <View style={[styles.tableCol, { width: "10%" }]}>
                <Text style={styles.tableCell}>{sub.totalScore}</Text>
              </View>
              <View style={[styles.tableCol, { width: "20%", borderRightWidth: 0 }]}>
                {/* Shows "Excellent", "Pass", "Credit" etc. */}
                <Text style={styles.remarkCell}>{sub.remark}</Text>
              </View>
            </View>
          ))}

          {/* Summary Row */}
          <View style={[styles.tableRow, { backgroundColor: "#f1f5f9", borderBottomWidth: 0 }]}>
            <View
              style={[
                styles.tableCol,
                { width: "70%", alignItems: "flex-start", borderRightWidth: 0, paddingLeft: 10 },
              ]}
            >
              {/* Show Aggregate Only if it exists (JHS/SHS) */}
              {student.aggregate !== null && student.aggregate !== undefined && (
                <Text style={{ fontSize: 9, fontWeight: "bold" }}>
                  AGGREGATE: {student.aggregate}
                </Text>
              )}
            </View>
            <View
              style={[
                styles.tableCol,
                {
                  width: "30%",
                  borderRightWidth: 0,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingRight: 10,
                },
              ]}
            >
              <Text style={{ fontSize: 9, fontWeight: "bold" }}>AVERAGE:</Text>
              <Text style={{ fontSize: 9, fontWeight: "bold" }}>{student.averageScore}%</Text>
            </View>
          </View>
        </View>

        {/* --- SECTION B --- */}
        <View style={styles.sectionB}>
          {/* Attendance & Conduct Grid */}
          <View style={styles.boxRow}>
            <View style={styles.box}>
              <Text style={styles.label}>ATTENDANCE</Text>
              <Text style={styles.value}>
                {student.attendancePresent || "-"} / {student.attendanceTotal || "-"}
              </Text>
            </View>
            <View style={styles.box}>
              <Text style={styles.label}>CONDUCT</Text>
              <Text style={styles.value}>{student.conduct || "Satisfactory"}</Text>
            </View>
            <View style={styles.box}>
              <Text style={styles.label}>NEXT TERM BEGINS</Text>
              <Text style={styles.value}>{settings.nextTermStarts || "TBA"}</Text>
            </View>
          </View>

          {/* Teacher's Remark */}
          <View style={styles.remarkBlock}>
            <Text style={styles.remarkTitle}>Class Teacher's Remark:</Text>
            <Text style={styles.remarkText}>{student.teacherRemark || "No remarks provided."}</Text>
          </View>

          {/* Headmaster's Remark (Auto-Generated) */}
          <View style={styles.remarkBlock}>
            <Text style={styles.remarkTitle}>Head Teacher's Remark:</Text>
            <Text style={styles.remarkText}>{headmasterRemark}</Text>
          </View>

          {/* Signatures */}
          <View style={styles.signatureRow}>
            <View style={styles.signatureLine}>
              <Text>Class Teacher's Signature</Text>
            </View>
            <View style={styles.signatureLine}>
              <Text>Head Teacher's Signature</Text>
            </View>
          </View>

          <Text style={{ fontSize: 7, color: "#94a3b8", textAlign: "center", marginTop: 20 }}>
            Generated by GES Report System • Not an official transcript without stamp
          </Text>
        </View>
      </Page>
    </Document>
  );
}
