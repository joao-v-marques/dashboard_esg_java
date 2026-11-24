package com.joao_v_marques.dashboard_esg.suppliers.qualification_result;

import org.springframework.data.jpa.repository.JpaRepository;

public interface QualificationResultRepository extends JpaRepository<QualificationResult, Integer> {

    boolean existsByNameIgnoreCase(String name);

    // Usado no PUT, para validar duplicidade ignorando o próprio resultado editado
    boolean existsByNameIgnoreCaseAndIdNot(String name, Integer id);
}
