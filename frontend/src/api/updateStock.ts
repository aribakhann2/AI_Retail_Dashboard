// src/services/inventoryService.ts
import api from "./axios"; // ✅ use your axios middleware

export const updateInventory = async (
  productName: string,
  newStockQuantity: number
): Promise<void> => {
  try {
    await api.post("inventory/update-stock", {
      productName,
      newStockQuantity,
    });
  } catch (error: any) {
    console.error("Error updating inventory:", error.response?.data || error.message);
    throw error;
  }
};
