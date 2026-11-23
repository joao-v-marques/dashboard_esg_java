package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit;

import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit.dto.LawsuitResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class LawsuitService {

    private final LawsuitRepository repository;

    public LawsuitService(LawsuitRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<LawsuitResponse> findAll() {
        return repository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private LawsuitResponse toResponse(Lawsuit lawsuit) {
        return new LawsuitResponse(
                lawsuit.getId(),
                lawsuit.getLawsuitDate(),
                lawsuit.getCaseNumber(),
                lawsuit.getPlaintiff(),
                lawsuit.getDefendant(),
                lawsuit.getClaimValue(),
                lawsuit.getSubjectMatter().getId(),
                lawsuit.getSubjectMatter().getName(),
                lawsuit.getProceedingStage().getId(),
                lawsuit.getProceedingStage().getName(),
                lawsuit.getStatus().getId(),
                lawsuit.getStatus().getName(),
                lawsuit.getLossProbability().getId(),
                lawsuit.getLossProbability().getName(),
                lawsuit.getInsertedBy().getId(),
                lawsuit.getInsertedBy().getName(),
                lawsuit.getCreatedAt(),
                lawsuit.getUpdatedAt(),
                lawsuit.getUpdatedBy() != null ? lawsuit.getUpdatedBy().getId() : null,
                lawsuit.getUpdatedBy() != null ? lawsuit.getUpdatedBy().getName() : null,
                lawsuit.isActive()
        );
    }
}
