package com.joao_v_marques.dashboard_esg.shared.units.dto;

import java.time.OffsetDateTime;

public record UnitResponse(
        Integer id,
        String name,
        String code,
        OffsetDateTime createdAt
) {
}
