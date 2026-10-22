package com.joao_v_marques.dashboard_esg.cooperative_members.dashboard.dto;

import java.math.BigDecimal;

public record PointsBandResponse(
        int band,
        int lowerBoundPercent,
        int upperBoundPercent,
        int memberCount,
        BigDecimal percentage
) {
}
