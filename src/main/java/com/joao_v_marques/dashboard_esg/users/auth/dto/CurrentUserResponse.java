package com.joao_v_marques.dashboard_esg.users.auth.dto;

import java.util.List;

// roles: todas as roles alcançáveis pela hierarquia (ex.: ADMINISTRATOR traz MANAGER e EMPLOYEE_WASTES),
// usadas pelo front para mostrar/esconder menus
public record CurrentUserResponse(
        String name,
        String username,
        String role,
        String sector,
        List<String> roles
) {
}
