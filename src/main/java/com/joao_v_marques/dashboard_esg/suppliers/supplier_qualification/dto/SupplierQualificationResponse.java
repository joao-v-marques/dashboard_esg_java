package com.joao_v_marques.dashboard_esg.suppliers.supplier_qualification.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record SupplierQualificationResponse(
        Integer id,
        Integer supplierId,
        String supplierCorporateName,
        String filledByName,
        String filledByPosition,
        LocalDate filledAt,
        Integer resultId,
        String resultName,
        String resultNotes,
        String qualifiedByName,
        Integer sectorId,
        String sectorName,
        LocalDate qualificationDate,
        String boardApprovalNotes,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        String updatedByName
) {
}
