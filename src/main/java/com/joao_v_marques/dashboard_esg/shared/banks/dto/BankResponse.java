package com.joao_v_marques.dashboard_esg.shared.banks.dto;

public record BankResponse(
        Integer id,
        String code,
        String name,
        boolean isActive
) {
}
