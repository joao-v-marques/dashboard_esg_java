package com.joao_v_marques.dashboard_esg.lawsuits.proceeding_stage;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ProceedingStageRepository extends JpaRepository<ProceedingStage, Integer> {

    boolean existsByNameIgnoreCase(String name);

    // Usado no PUT, para validar duplicidade ignorando o próprio trâmite editado
    boolean existsByNameIgnoreCaseAndIdNot(String name, Integer id);
}
