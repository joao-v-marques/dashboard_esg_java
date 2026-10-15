package com.joao_v_marques.dashboard_esg.users.sector;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SectorRepository extends JpaRepository<Sector, Integer> {

    boolean existsByNameIgnoreCase(String name);

    // Usado no PUT, para validar duplicidade ignorando o próprio setor editado
    boolean existsByNameIgnoreCaseAndIdNot(String name, Integer id);
}
