package com.joao_v_marques.dashboard_esg.users.role;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<Role, Integer> {

    boolean existsByNameIgnoreCase(String name);

    // Usado no PUT, para validar duplicidade ignorando a própria role editada
    boolean existsByNameIgnoreCaseAndIdNot(String name, Integer id);
}
