package com.joao_v_marques.dashboard_esg.nips.nip.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record NipResponse(
        Integer id,
        String nipNumber,
        LocalDate notificationDate,
        String demandCode,
        String protocolCode,
        String beneficiaryName,
        String beneficiaryCpf,
        String description,
        String responseDescription,
        Integer statusId,
        String statusName,
        Integer natureId,
        String natureName,
        String insertedBy,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        String updatedBy
) {
}
