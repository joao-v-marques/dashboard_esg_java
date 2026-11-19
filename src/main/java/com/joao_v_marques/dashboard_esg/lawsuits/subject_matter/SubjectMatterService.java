package com.joao_v_marques.dashboard_esg.lawsuits.subject_matter;

import com.joao_v_marques.dashboard_esg.lawsuits.subject_matter.dto.SubjectMatterRequest;
import com.joao_v_marques.dashboard_esg.lawsuits.subject_matter.dto.SubjectMatterResponse;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ConflictException;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SubjectMatterService {

    private final SubjectMatterRepository subjectMatterRepository;

    public SubjectMatterService(SubjectMatterRepository subjectMatterRepository) {
        this.subjectMatterRepository = subjectMatterRepository;
    }

    // GET de todos os objetos cadastrados
    @Transactional(readOnly = true)
    public List<SubjectMatterResponse> findAll() {
        return subjectMatterRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public SubjectMatterResponse create(SubjectMatterRequest request) {
        String name = request.name().trim();

        if (subjectMatterRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("O objeto que está tentando cadastrar já existe");
        }

        // Montar entidade com base na dto
        SubjectMatter subjectMatter = new SubjectMatter();
        subjectMatter.setName(name);

        SubjectMatter saved = subjectMatterRepository.save(subjectMatter);

        return toResponse(saved);
    }

    @Transactional
    public SubjectMatterResponse update(Integer subjectMatterId, SubjectMatterRequest request) {
        String name = request.name().trim();

        // Valida se o objeto editado realmente existe
        SubjectMatter subjectMatter = subjectMatterRepository.findById(subjectMatterId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum objeto com o ID fornecido."));

        // Validações que a DTO não cobre
        if (!subjectMatter.isActive()) {
            throw new IllegalArgumentException("Não é possível editar uma ocorrência inativa.");
        }

        if (subjectMatterRepository.existsByNameIgnoreCaseAndIdNot(name, subjectMatterId)) {
            throw new ConflictException("Já existe outro objeto cadastrado com este nome");
        }

        // Atualizar a entidade já existente
        subjectMatter.setName(name);

        return toResponse(subjectMatter);
    }

    @Transactional
    public SubjectMatterResponse deactivate(Integer subjectMatterId) {
        // Valida se o objeto desativado realmente existe
        SubjectMatter subjectMatter = subjectMatterRepository.findById(subjectMatterId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum objeto com o ID fornecido."));

        if (!subjectMatter.isActive()) {
            throw new IllegalArgumentException("Este objeto já está inativo.");
        }

        subjectMatter.setActive(false);

        return toResponse(subjectMatter);
    }

    @Transactional
    public SubjectMatterResponse reactivate(Integer subjectMatterId) {
        // Valida se o objeto reativado realmente existe
        SubjectMatter subjectMatter = subjectMatterRepository.findById(subjectMatterId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum objeto com o ID fornecido."));

        if (subjectMatter.isActive()) {
            throw new IllegalArgumentException("Este objeto já está ativo.");
        }

        subjectMatter.setActive(true);

        return toResponse(subjectMatter);
    }

    private SubjectMatterResponse toResponse(SubjectMatter subjectMatter) {
        return new SubjectMatterResponse(
                subjectMatter.getId(),
                subjectMatter.getName(),
                subjectMatter.isActive()
        );
    }
}
