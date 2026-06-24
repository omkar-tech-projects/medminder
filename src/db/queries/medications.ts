// Re-export from the canonical medicines module so legacy import paths still resolve.
export {
  getAllMedicines as getAllMedications,
  getMedicineById as getMedicationById,
  insertMedicine as insertMedication,
  updateMedicine as updateMedication,
  deleteMedicine as deleteMedication,
} from './medicines';
