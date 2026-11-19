package com.joao_v_marques.dashboard_esg.lawsuits.subject_matter;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SubjectMatterRepository extends JpaRepository<SubjectMatter, Integer> {

    boolean existsByNameIgnoreCase(String name);

    // Usado no PUT, para validar duplicidade ignorando o próprio objeto editado
    boolean existsByNameIgnoreCaseAndIdNot(String name, Integer id);
}
