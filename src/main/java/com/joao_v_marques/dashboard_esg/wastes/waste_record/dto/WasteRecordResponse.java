package com.joao_v_marques.dashboard_esg.wastes.waste_record.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record WasteRecordResponse(
        Integer id,
        LocalDate recordDate,
        String unitName,
        String wasteTypeName,
        BigDecimal weightKg,
        String observations,
        String insertedBy,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        String UpdatedBy
) {
}
