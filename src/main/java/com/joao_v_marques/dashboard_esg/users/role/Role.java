package com.joao_v_marques.dashboard_esg.users.role;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Set;

@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor
public class Role {

    // Roles usadas no SecurityConfig (hasRole e hierarquia ADMINISTRATOR > MANAGER > EMPLOYEE_WASTES / EMPLOYEE_LEGAL)
    public static final String ADMINISTRATOR = "ADMINISTRATOR";
    public static final String MANAGER = "MANAGER";
    public static final String EMPLOYEE_WASTES = "EMPLOYEE_WASTES";
    public static final String EMPLOYEE_LEGAL = "EMPLOYEE_LEGAL";

    // Editar ou desativar qualquer uma delas tiraria o acesso de quem a possui
    public static final Set<String> PROTECTED = Set.of(ADMINISTRATOR, MANAGER, EMPLOYEE_WASTES, EMPLOYEE_LEGAL);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "name", nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;
}
