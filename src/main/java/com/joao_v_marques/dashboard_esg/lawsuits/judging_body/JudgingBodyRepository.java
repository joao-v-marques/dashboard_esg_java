package com.joao_v_marques.dashboard_esg.lawsuits.judging_body;

import org.springframework.data.jpa.repository.JpaRepository;

public interface JudgingBodyRepository extends JpaRepository<JudgingBody, Integer> {

    boolean existsByNameIgnoreCase(String name);

    // Usado no PUT, para validar duplicidade ignorando o próprio órgão julgador editado
    boolean existsByNameIgnoreCaseAndIdNot(String name, Integer id);
}
