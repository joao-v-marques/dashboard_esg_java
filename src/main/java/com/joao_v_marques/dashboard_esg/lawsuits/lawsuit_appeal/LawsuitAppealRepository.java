package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_appeal;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LawsuitAppealRepository extends JpaRepository<LawsuitAppeal, Integer> {

    // Carrega as associações LAZY no mesmo SELECT (via JOIN), evitando o N+1 no toResponse.
    // Ordena por processo e, dentro dele, pela sequência do recurso
    @EntityGraph(attributePaths = {"lawsuit", "judgingBody", "status", "lossProbability", "insertedBy", "updatedBy"})
    List<LawsuitAppeal> findAllByOrderByLawsuitIdAscAppealSequenceAsc();

    // Recursos de um processo específico, na ordem da sequência
    @EntityGraph(attributePaths = {"lawsuit", "judgingBody", "status", "lossProbability", "insertedBy", "updatedBy"})
    List<LawsuitAppeal> findByLawsuitIdOrderByAppealSequenceAsc(Integer lawsuitId);
}
