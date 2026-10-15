package com.joao_v_marques.dashboard_esg.wastes.waste_type.dto;

import java.time.OffsetDateTime;

public record WasteTypeResponse(
        Integer id,
        String name,
        String code,
        boolean isRecyclable,
        OffsetDateTime createdAt
) {
}
