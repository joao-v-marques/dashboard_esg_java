package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LawsuitRepository extends JpaRepository<Lawsuit, Integer> {

    // Carrega as associações LAZY no mesmo SELECT (via JOIN), evitando o N+1 no toResponse
    @Override
    @EntityGraph(attributePaths = {"subjectMatter", "proceedingStage", "status", "lossProbability", "insertedBy", "updatedBy"})
    List<Lawsuit> findAll();

    boolean existsByCaseNumber(String caseNumber);
}
