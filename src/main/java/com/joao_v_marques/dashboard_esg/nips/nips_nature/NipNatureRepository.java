package com.joao_v_marques.dashboard_esg.nips.nips_nature;

import org.springframework.data.jpa.repository.JpaRepository;

public interface NipNatureRepository extends JpaRepository<NipNature, Integer> {

    boolean existsByNameIgnoreCase(String name);

    // Usado no PUT, para validar duplicidade ignorando a própria natureza editada
    boolean existsByNameIgnoreCaseAndIdNot(String name, Integer id);
}
