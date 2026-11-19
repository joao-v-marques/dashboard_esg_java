package com.joao_v_marques.dashboard_esg.lawsuits.loss_probability;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LossProbabilityRepository extends JpaRepository<LossProbability, Integer> {

    boolean existsByNameIgnoreCase(String name);

    // Usado no PUT, para validar duplicidade ignorando a própria probabilidade editada
    boolean existsByNameIgnoreCaseAndIdNot(String name, Integer id);
}
