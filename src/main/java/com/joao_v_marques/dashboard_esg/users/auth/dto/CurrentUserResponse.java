package com.joao_v_marques.dashboard_esg.users.auth.dto;

public record CurrentUserResponse(
        String name,
        String username,
        String role
) {
}
