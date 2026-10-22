package com.joao_v_marques.dashboard_esg.cooperative_members.dashboard.dto;

import java.math.BigDecimal;

// O card mostra o absoluto junto do %, então os dois vão no payload
public record TrainedInCooperativismResponse(
        int count,
        int total,
        BigDecimal percentage
) {
}
