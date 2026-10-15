package com.joao_v_marques.dashboard_esg.users.user.dto;

import java.time.OffsetDateTime;

public record UserResponse(
        Integer id,
        String name,
        String username,
        String email,
        Integer roleId,
        String roleName,
        Integer sectorId,
        String sectorName,
        OffsetDateTime createdAt,
        boolean isActive
) {
}
