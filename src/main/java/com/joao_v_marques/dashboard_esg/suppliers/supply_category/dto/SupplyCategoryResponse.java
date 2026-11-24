package com.joao_v_marques.dashboard_esg.suppliers.supply_category.dto;

public record SupplyCategoryResponse(
        Integer id,
        String name,
        boolean isActive
) {
}
