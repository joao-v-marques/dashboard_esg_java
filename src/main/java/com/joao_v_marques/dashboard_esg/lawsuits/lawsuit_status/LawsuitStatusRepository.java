package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_status;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LawsuitStatusRepository extends JpaRepository<LawsuitStatus, Integer> {

    boolean existsByNameIgnoreCase(String name);

    // Usado no PUT, para validar duplicidade ignorando o próprio status editado
    boolean existsByNameIgnoreCaseAndIdNot(String name, Integer id);
}
