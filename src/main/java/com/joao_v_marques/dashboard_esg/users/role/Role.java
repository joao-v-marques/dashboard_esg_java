package com.joao_v_marques.dashboard_esg.users.role;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor
public class Role {

    // Nome da role usada no hasRole("ADMINISTRATOR") do SecurityConfig, não pode ser editada nem desativada
    public static final String ADMINISTRATOR = "ADMINISTRATOR";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "name", nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;
}
