package com.joao_v_marques.dashboard_esg.suppliers.supplier.dto;

import java.time.OffsetDateTime;

public record SupplierResponse(
        Integer id,
        String cnpj,
        String corporateName,
        String tradeName,
        String stateRegistration,
        Integer supplyCategoryId,
        String supplyCategoryName,
        String productDescription,
        String zipCode,
        String street,
        String number,
        String complement,
        String neighborhood,
        String city,
        String state,
        String phone,
        String contactName,
        String email,
        String website,
        Integer bankId,
        String bankName,
        String agency,
        String account,
        String insertedByName,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        String updatedByName,
        boolean isActive
) {
}
